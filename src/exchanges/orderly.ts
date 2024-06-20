import { getPublicKeyAsync, signAsync } from '@noble/ed25519'
import { Chain, WalletClient } from 'viem'
import { FixedNumber } from '../common/fixedNumber'
import { APICallParamsWithMetadata, ActionParam, RequestSignerFnWithMetadata } from '../interfaces/IActionExecutor'
import {
  AccountInfo,
  AgentParams,
  AgentState,
  AmountInfo,
  ApiOpts,
  AuthParams,
  AvailableToTradeParams,
  CancelOrder,
  ClaimInfo,
  ClosePositionData,
  CloseTradePreviewInfo,
  CreateOrder,
  DepositWithdrawParams,
  DynamicMarketMetadata,
  GenericStaticMarketMetadata,
  HistoricalTradeInfo,
  IdleMarginInfo,
  LiquidationInfo,
  Market,
  MarketInfo,
  MarketState,
  OBData,
  OpenTradePreviewInfo,
  OrderBook,
  OrderInfo,
  PageOptions,
  PaginatedRes,
  PositionInfo,
  PreviewInfo,
  Protocol,
  ProtocolId,
  UpdateOrder,
  UpdatePositionMarginData
} from '../interfaces/V1/IRouterAdapterBaseV1'
import { IAdapterV1, ProtocolInfo } from '../interfaces/V1/IAdapterV1'
import { AbiCoder, keccak256, solidityPackedKeccak256 } from 'ethers-v6'
import {
  EMPTY_DESC,
  ORDERLY_APPROVE_H,
  ORDERLY_CREATE_KEY_H,
  ORDERLY_DEPOSIT_H,
  ORDERLY_REGISTER_H,
  ORDERLY_SETTLE_PNL_H,
  ORDERLY_WITHDRAW_H
} from '../common/buttonHeadings'
import base58 from 'bs58'
import { rpc } from '../common/provider'
import { NativeUSDC__factory, Vault__factory } from '../../typechain/orderly'
import { VaultTypes } from '../../typechain/orderly/Vault'
import { BigNumber } from 'ethers'
import { arbitrum, optimism } from 'viem/chains'
import { order as orderHelper } from '@orderly.network/perp'
import { API } from '@orderly.network/types'
import { decodeMarketId, encodeMarketId } from '../common/markets'
import { ORDERLY_COLLATERAL_TOKEN, ORDERLY_TAKER_FEE_BPS, orderly } from '../configs/orderly/config'
import { ZERO_FN } from '../common/constants'
import {
  FundingFeeHistory,
  OrderbookData,
  OrderlyLiquidationInfo,
  OrderlyPaginationMeta
} from '../configs/orderly/types'
import { tokens } from '../common/tokens'
import {
  CACHE_MINUTE,
  CACHE_SECOND,
  CACHE_TIME_MULT,
  ORDERLY_CACHE_PREFIX,
  cacheFetch,
  getStaleTime
} from '../common/cache'
import { toAmountInfoFN } from '../common/helper'
import { traverseOrderlyBook } from '../configs/orderly/orderlyObTraversal'

export default class OrderlyAdapter implements IAdapterV1 {
  protocolId: ProtocolId = 'ORDERLY'

  private accountId: string
  private baseUrl: string
  private orderlyKey?: Uint8Array

  private static MESSAGE_TYPES = {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' }
    ],
    Registration: [
      { name: 'brokerId', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'timestamp', type: 'uint64' },
      { name: 'registrationNonce', type: 'uint256' }
    ],
    AddOrderlyKey: [
      { name: 'brokerId', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'orderlyKey', type: 'string' },
      { name: 'scope', type: 'string' },
      { name: 'timestamp', type: 'uint64' },
      { name: 'expiration', type: 'uint64' }
    ],
    Withdraw: [
      { name: 'brokerId', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'token', type: 'string' },
      { name: 'amount', type: 'uint256' },
      { name: 'withdrawNonce', type: 'uint64' },
      { name: 'timestamp', type: 'uint64' }
    ],
    SettlePnl: [
      { name: 'brokerId', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'settleNonce', type: 'uint64' },
      { name: 'timestamp', type: 'uint64' }
    ]
  }

  constructor(private address: string, private brokerId: string, private chainId: number) {
    this.accountId = this.getAccountId(address, brokerId)
    this.baseUrl = this.getBaseUrl(this.chainId)
  }

  async init(wallet: string | undefined, opts?: ApiOpts): Promise<void> {}

  setCredentials(auth: AuthParams<this['protocolId']>): void {
    throw new Error('Method not implemented.')
  }

  async setup(): Promise<ActionParam[]> {
    return []
  }

  async deposit(params: DepositWithdrawParams[]): Promise<ActionParam[]> {
    const txs: ActionParam[] = []

    for (const { amount, protocol, wallet } of params) {
      if (protocol !== 'ORDERLY') throw new Error('invalid protocol id')

      const provider = rpc[this.chainId]
      const tokenAmount = amount.toFormat(6).value

      const vaultAddress = this.getVaultAddress(this.chainId)
      const vaultContract = Vault__factory.connect(vaultAddress, provider)

      const usdcAddress = this.getUsdcAddress(this.chainId)
      const usdcContract = NativeUSDC__factory.connect(usdcAddress, provider)
      const allowance = await usdcContract.allowance(wallet, vaultAddress)
      if (allowance.lt(tokenAmount)) {
        const tx = await usdcContract.populateTransaction.approve(vaultAddress, tokenAmount)
        txs.push({
          tx,
          desc: EMPTY_DESC,
          chainId: this.chainId,
          isUserAction: true,
          isAgentRequired: false,
          heading: ORDERLY_APPROVE_H
        })
      }

      const encoder = new TextEncoder()
      const depositInput = {
        accountId: this.accountId,
        brokerHash: keccak256(encoder.encode(this.brokerId)),
        // if other tokens than USDC need to be supported, we also need decimal metadata for formatting of that token
        tokenHash: keccak256(encoder.encode('USDC')),
        tokenAmount
      } satisfies VaultTypes.VaultDepositFEStruct

      // get wei deposit fee for `deposit` call
      const depositFee = await vaultContract.getDepositFee(wallet, depositInput)

      const tx = await vaultContract.populateTransaction.deposit(depositInput, { value: depositFee })

      txs.push({
        tx,
        desc: EMPTY_DESC,
        chainId: this.chainId,
        isUserAction: true,
        isAgentRequired: false,
        heading: ORDERLY_DEPOSIT_H,
        ethRequired: BigNumber.from(depositFee)
      })
    }

    return txs
  }

  async withdraw(params: DepositWithdrawParams[]): Promise<ActionParam[]> {
    const actions: ActionParam[] = []
    if (!this.orderlyKey) {
      throw new Error('Orderly key not initialized')
    }

    for (const { amount, protocol, wallet } of params) {
      if (protocol !== 'ORDERLY') throw new Error('invalid protocol id')

      const nonceRes = await this.signAndSendRequest('/v1/withdraw_nonce', [], 0, { bypassCache: true })
      const nonceJson = await nonceRes.json()
      const withdrawNonce = nonceJson.data.withdraw_nonce as string

      const tokenAmount = amount.toFormat(6).value
      if (tokenAmount <= 2_500_000n) {
        throw new Error('Orderly: withdraw amount must be greater than 2.5USDC')
      }
      const withdrawMessage = {
        brokerId: this.brokerId,
        chainId: this.chainId,
        receiver: wallet,
        token: 'USDC',
        amount: tokenAmount.toString(),
        timestamp: Date.now(),
        withdrawNonce
      }

      actions.push({
        desc: 'Withdraw balance from Orderly',
        chainId: this.chainId,
        heading: ORDERLY_WITHDRAW_H,
        isUserAction: true,
        fn: async (wallet: WalletClient, agentAddress?: string) => {
          if (!wallet.account || !this.orderlyKey) return
          const signature = await wallet.signTypedData({
            account: wallet.account,
            message: withdrawMessage,
            primaryType: 'Withdraw',
            types: OrderlyAdapter.MESSAGE_TYPES,
            domain: this.getOnChainDomain(this.chainId)
          })

          const timestamp = Date.now()
          const encoder = new TextEncoder()

          const body = JSON.stringify({
            message: withdrawMessage,
            signature,
            userAddress: wallet.account.address,
            verifyingContract: this.getVerifyingAddress(this.chainId)
          })

          const message = `${String(timestamp)}POST/v1/withdraw_request${body}`
          const orderlySignature = await signAsync(encoder.encode(message), this.orderlyKey)
          return [
            `${this.baseUrl}/v1/withdraw_request`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'orderly-timestamp': String(timestamp),
                'orderly-account-id': this.accountId,
                'orderly-key': `ed25519:${base58.encode(await getPublicKeyAsync(this.orderlyKey))}`,
                'orderly-signature': this.base64EncodeURL(orderlySignature)
              },
              body
            }
          ]
        },
        isEoaSigner: true,
        isAgentRequired: false
      } satisfies RequestSignerFnWithMetadata)
    }

    return actions
  }

  async settlePnl(): Promise<ActionParam[]> {
    const actions: ActionParam[] = []
    if (!this.orderlyKey) {
      throw new Error('Orderly key not initialized')
    }

    const nonceRes = await this.signAndSendRequest('/v1/settle_nonce', [], 0, { bypassCache: true })
    const nonceJson = await nonceRes.json()
    const settleNonce = nonceJson.data.settle_nonce as string

    const settlePnlMessage = {
      brokerId: this.brokerId,
      chainId: this.chainId,
      timestamp: Date.now(),
      settleNonce
    }

    actions.push({
      desc: 'Settle PnL for Orderly',
      chainId: this.chainId,
      heading: ORDERLY_SETTLE_PNL_H,
      isUserAction: true,
      fn: async (wallet: WalletClient, agentAddress?: string) => {
        if (!wallet.account || !this.orderlyKey) return
        const signature = await wallet.signTypedData({
          account: wallet.account,
          message: settlePnlMessage,
          primaryType: 'SettlePnl',
          types: OrderlyAdapter.MESSAGE_TYPES,
          domain: this.getOnChainDomain(this.chainId)
        })

        const timestamp = Date.now()
        const encoder = new TextEncoder()

        const body = JSON.stringify({
          message: settlePnlMessage,
          signature,
          userAddress: wallet.account.address,
          verifyingContract: this.getVerifyingAddress(this.chainId)
        })

        const message = `${String(timestamp)}POST/v1/settle_pnl${body}`
        const orderlySignature = await signAsync(encoder.encode(message), this.orderlyKey)
        return [
          `${this.baseUrl}/v1/settle_pnl`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'orderly-timestamp': String(timestamp),
              'orderly-account-id': this.accountId,
              'orderly-key': `ed25519:${base58.encode(await getPublicKeyAsync(this.orderlyKey))}`,
              'orderly-signature': this.base64EncodeURL(orderlySignature)
            },
            body
          }
        ]
      },
      isEoaSigner: true,
      isAgentRequired: false
    } satisfies RequestSignerFnWithMetadata)

    return actions
  }

  supportedChains(opts?: ApiOpts | undefined): Chain[] {
    return [optimism, arbitrum]
  }

  async supportedMarkets(chains: Chain[] | undefined, opts?: ApiOpts | undefined): Promise<MarketInfo[]> {
    const symbolInfos = await this.getOrderlySymbolInfos(opts)
    return symbolInfos.map((symbolInfo) => {
      const [_, base, quote] = symbolInfo.symbol.split('_') // symbols returned from API are always `PERP_<BASE>_<QUOTE>, so base token can be extrated like this

      const market: Market = {
        marketId: encodeMarketId(orderly.id.toString(), 'ORDERLY', symbolInfo.symbol),
        chain: orderly,
        indexToken: ORDERLY_COLLATERAL_TOKEN,
        longCollateral: [ORDERLY_COLLATERAL_TOKEN],
        shortCollateral: [ORDERLY_COLLATERAL_TOKEN],
        supportedModes: {
          ISOLATED: false,
          CROSS: true
        },
        supportedOrderTypes: {
          LIMIT: true,
          MARKET: true,
          STOP_LOSS: false,
          TAKE_PROFIT: false,
          STOP_LOSS_LIMIT: false,
          TAKE_PROFIT_LIMIT: false
        },
        supportedOrderActions: {
          CREATE: true,
          UPDATE: true,
          CANCEL: true
        },
        marketSymbol: base
      }

      // TODO we also have max position size in notional
      let maxPositionSize
      switch (base) {
        case 'BTC':
        case 'ETH':
          maxPositionSize = FixedNumber.fromString(String(5_000_000))
          break
        default:
          maxPositionSize = FixedNumber.fromString(String(2_000_000))
      }

      const staticMetadata: GenericStaticMarketMetadata = {
        // this is only for symbol. There's also max account leverage
        maxLeverage: FixedNumber.fromString(String(1 / symbolInfo.base_imr)),
        minLeverage: FixedNumber.fromString('1'),
        minInitialMargin: FixedNumber.fromString(String(symbolInfo.base_imr)),
        minPositionSize: FixedNumber.fromString(String(symbolInfo.min_notional)),
        minPositionSizeToken: FixedNumber.fromString(String(symbolInfo.base_min)),
        maxPrecision: symbolInfo.base_tick, // TODO check 0.001 -> 3 ? Used to display orderbook in USD
        amountStep: FixedNumber.fromString(String(symbolInfo.base_tick)),
        priceStep: FixedNumber.fromString(String(symbolInfo.quote_tick))
      }

      const protocol: Protocol = {
        protocolId: 'ORDERLY'
      }

      return {
        ...market,
        ...staticMetadata,
        ...protocol
      }
    })
  }

  getProtocolInfo(): ProtocolInfo {
    return {
      hasAgent: true,
      hasAccount: true,
      hasOrderbook: true,
      sizeDeltaInToken: false,
      explicitFundingClaim: false,
      collateralDeltaInToken: false,
      collateralUsesLimitPricing: false,
      depositData: {
        '10': [tokens.USDC],
        '42161': [tokens.USDC]
      }
    }
  }

  async getAvailableToTrade(
    wallet: string,
    params: AvailableToTradeParams<this['protocolId']>,
    opts?: ApiOpts | undefined
  ): Promise<AmountInfo> {
    const info = await this.getOrderlyPositionsInfo(opts)
    return {
      amount: FixedNumber.fromString(String(info.free_collateral)),
      isTokenAmount: false
    }
  }

  async getMarketPrices(marketIds: string[], opts?: ApiOpts | undefined): Promise<FixedNumber[]> {
    const prices: FixedNumber[] = []

    const sTimeFPU = getStaleTime(CACHE_MINUTE, opts)
    const marketInfos = await this.getOrderlyMarketInfos(opts)

    marketIds.forEach((mId) => {
      const { protocolMarketId } = decodeMarketId(mId)
      const mark_price = marketInfos.find(({ symbol }) => symbol === protocolMarketId)?.mark_price
      if (mark_price == null) return
      prices.push(FixedNumber.fromString(String(mark_price)))
    })
    return prices
  }

  async getMarketsInfo(marketIds: string[], opts?: ApiOpts | undefined): Promise<MarketInfo[]> {
    let marketInfo: MarketInfo[] = []

    const supportedMarkets = await this.supportedMarkets(this.supportedChains(), opts)

    marketIds.forEach((mId) => {
      const market = supportedMarkets.find((m) => m.marketId === mId)
      if (market) {
        marketInfo.push(market)
      }
    })

    return marketInfo
  }

  async getDynamicMarketMetadata(marketIds: string[], opts?: ApiOpts | undefined): Promise<DynamicMarketMetadata[]> {
    const metadata: DynamicMarketMetadata[] = []

    const sTimeFPU = getStaleTime(CACHE_MINUTE, opts)
    const marketInfos = await cacheFetch({
      key: [ORDERLY_CACHE_PREFIX, 'getMarketPrices'],
      fn: async () => {
        const res = await fetch(`${this.baseUrl}/v1/public/futures`)
        return (await res.json()).data.rows as API.MarketInfo[]
      },
      staleTime: sTimeFPU,
      cacheTime: sTimeFPU * CACHE_TIME_MULT,
      opts
    })

    marketIds.forEach((mId) => {
      const { protocolMarketId } = decodeMarketId(mId)
      const marketInfo = marketInfos.find(({ symbol }) => symbol === protocolMarketId)
      if (marketInfo == null) return

      const dynamicMetadata: DynamicMarketMetadata = {
        oiLong: FixedNumber.fromString(String(marketInfo.open_interest), 30),
        oiShort: FixedNumber.fromString(String(marketInfo.open_interest), 30),
        isOiBifurcated: false,
        availableLiquidityLong: ZERO_FN, // TODO +-2% of orderbook
        availableLiquidityShort: ZERO_FN,
        longFundingRate: FixedNumber.fromString(String(marketInfo.last_funding_rate), 30),
        shortFundingRate: FixedNumber.fromString(String(marketInfo.last_funding_rate), 30).mulFN(
          FixedNumber.fromValue(-1n)
        ),
        longBorrowRate: ZERO_FN,
        shortBorrowRate: ZERO_FN
      }

      metadata.push(dynamicMetadata)
    })

    return metadata
  }

  async increasePosition(orderData: CreateOrder[], wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    const actions: ActionParam[] = []

    for (const createOrder of orderData) {
      const { protocolMarketId: symbol } = decodeMarketId(createOrder.marketId)
      const apiCall: APICallParamsWithMetadata = {
        apiArgs: [
          `${this.baseUrl}/v1/order`,
          await this.getRequestInit('/v1/order', {
            method: 'POST',
            body: JSON.stringify({
              symbol,
              order_type: createOrder.type,
              order_price: createOrder.triggerData?.triggerPrice.toUnsafeFloat(),
              order_quantity: createOrder.sizeDelta.isTokenAmount
                ? createOrder.sizeDelta.amount.toUnsafeFloat()
                : undefined,
              order_amount: !createOrder.sizeDelta.isTokenAmount
                ? createOrder.sizeDelta.amount.toUnsafeFloat()
                : undefined,
              side: createOrder.direction === 'LONG' ? 'BUY' : 'SELL'
            })
          })
        ],
        desc: 'Create order',
        chainId: this.chainId,
        heading: EMPTY_DESC,
        isUserAction: false
      }
      actions.push(apiCall)
    }
    return actions
  }

  async updateOrder(orderData: UpdateOrder[], wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    const actions: ActionParam[] = []

    for (const updateOrder of orderData) {
      const { protocolMarketId: symbol } = decodeMarketId(updateOrder.marketId)
      const apiCall: APICallParamsWithMetadata = {
        apiArgs: [
          `${this.baseUrl}/v1/order`,
          await this.getRequestInit('/v1/order', {
            method: 'PUT',
            body: JSON.stringify({
              order_id: updateOrder.orderId,
              symbol,
              order_type: updateOrder.orderType,
              order_price: updateOrder.triggerData?.triggerPrice.toUnsafeFloat(),
              order_quantity: updateOrder.sizeDelta.isTokenAmount
                ? updateOrder.sizeDelta.amount.toUnsafeFloat()
                : undefined,
              order_amount: !updateOrder.sizeDelta.isTokenAmount
                ? updateOrder.sizeDelta.amount.toUnsafeFloat()
                : undefined,
              side: updateOrder.direction === 'LONG' ? 'BUY' : 'SELL'
            })
          })
        ],
        desc: 'Update order',
        chainId: this.chainId,
        heading: EMPTY_DESC,
        isUserAction: false
      }
      actions.push(apiCall)
    }
    return actions
  }

  async cancelOrder(orderData: CancelOrder[], wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    const actions: ActionParam[] = []

    for (const cancelOrder of orderData) {
      const { protocolMarketId: symbol } = decodeMarketId(cancelOrder.marketId)
      const apiCall: APICallParamsWithMetadata = {
        apiArgs: [
          `${this.baseUrl}/v1/order?order_id=${cancelOrder.orderId}&symbol=${symbol}`,
          await this.getRequestInit('/v1/order', {
            method: 'DELETE'
          })
        ],
        desc: 'Cancel order',
        chainId: this.chainId,
        heading: EMPTY_DESC,
        isUserAction: false
      }
      actions.push(apiCall)
    }
    return actions
  }

  async authenticateAgent(
    agentParams: AgentParams[],
    wallet: string,
    opts?: ApiOpts | undefined
  ): Promise<ActionParam[]> {
    if (agentParams.length !== 1) throw new Error('agent params should be single item')

    const agent = agentParams[0]

    const actions: ActionParam[] = []

    let res = await fetch(`${this.baseUrl}/v1/get_account?address=${this.address}&broker_id=${this.brokerId}`)
    const getAccount: { success: boolean } = await res.json()
    const doesAccountExist = getAccount.success
    if (!doesAccountExist) {
      actions.push({
        desc: 'Register new account at Orderly',
        chainId: this.chainId,
        heading: ORDERLY_REGISTER_H,
        isUserAction: true,
        fn: async (wallet: WalletClient, agentAddress?: string) => {
          if (!wallet.account) return
          const signature = await wallet.signTypedData({
            account: wallet.account,
            message: registerMessage,
            primaryType: 'Registration',
            types: OrderlyAdapter.MESSAGE_TYPES,
            domain: this.getOffChainDomain(this.chainId)
          })
          return [
            `${this.baseUrl}/v1/register_account`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                message: registerMessage,
                signature,
                userAddress: wallet.account.address
              })
            }
          ]
        },
        isEoaSigner: true,
        isAgentRequired: false
      } satisfies RequestSignerFnWithMetadata)
    }

    // privateKey is assumed to be received in the format `ed25519:<base58 encoded 32 bytes key>`
    // some libraries (like tweetnacl) encode the private key including the seed, which makes it 64 bytes.
    // A library that uses 32 bytes private keys is e.g. @noble/ed25519
    const privateKey = agent.agentAddress
    this.orderlyKey = base58.decode(privateKey.substring(8))
    const orderlyKey = `ed25519:${base58.encode(await getPublicKeyAsync(this.orderlyKey))}`

    res = await this.signAndSendRequest('/v1/client/key_info', ['keyInfo'], getStaleTime(CACHE_MINUTE, opts), opts)
    const response = await res.json()

    if (response.success) {
      return actions
    }

    const keyExpirationInDays = opts?.orderlyAuth?.keyExpirationInDays ?? 365

    const timestamp = Date.now()
    const registerMessage = {
      brokerId: this.brokerId,
      chainId: String(this.chainId),
      orderlyKey,
      scope: 'read,trading',
      timestamp,
      expiration: timestamp + 1_000 * 60 * 60 * 24 * keyExpirationInDays
    }

    actions.push({
      desc: 'Create new Orderly key',
      chainId: this.chainId,
      heading: ORDERLY_CREATE_KEY_H,
      isUserAction: true,
      fn: async (wallet: WalletClient, agentAddress?: string) => {
        if (!wallet.account) return
        const signature = await wallet.signTypedData({
          account: wallet.account,
          message: registerMessage,
          primaryType: 'AddOrderlyKey',
          types: OrderlyAdapter.MESSAGE_TYPES,
          domain: this.getOffChainDomain(this.chainId)
        })
        return [
          `${this.baseUrl}/v1/orderly_key`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: registerMessage,
              signature,
              userAddress: wallet.account.address
            })
          }
        ]
      },
      isEoaSigner: true,
      isAgentRequired: false
    } satisfies RequestSignerFnWithMetadata)
    return actions
  }

  async closePosition(
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[],
    wallet: string,
    opts?: ApiOpts | undefined
  ): Promise<ActionParam[]> {
    const actions: ActionParam[] = []

    for (let i = 0; i < positionInfo.length; i++) {
      const position = positionInfo[i]
      const positionData = closePositionData[i]
      if (positionData.type !== 'MARKET') {
        throw new Error('Only market type for closing position is supported')
      }

      const { protocolMarketId: symbol } = decodeMarketId(position.marketId)
      const apiCall: APICallParamsWithMetadata = {
        apiArgs: [
          `${this.baseUrl}/v1/order`,
          await this.getRequestInit('/v1/order', {
            method: 'POST',
            body: JSON.stringify({
              symbol,
              order_type: 'MARKET',
              reduce_only: true,
              order_quantity: positionData.closeSize.isTokenAmount
                ? positionData.closeSize.amount.toUnsafeFloat()
                : undefined,
              order_amount: !positionData.closeSize.isTokenAmount
                ? positionData.closeSize.amount.toUnsafeFloat()
                : undefined,
              side: position.direction === 'LONG' ? 'SELL' : 'BUY'
            })
          })
        ],
        desc: 'Close position',
        chainId: this.chainId,
        heading: EMPTY_DESC,
        isUserAction: false
      }
      actions.push(apiCall)
    }
    return actions
  }

  updatePositionMargin(
    positionInfo: PositionInfo[],
    updatePositionMarginData: UpdatePositionMarginData[],
    wallet: string,
    opts?: ApiOpts | undefined
  ): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }

  claimFunding(wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }

  getIdleMargins(wallet: string, opts?: ApiOpts | undefined): Promise<IdleMarginInfo[]> {
    // this is basically free collateral
    throw new Error('Method not implemented.')
  }

  async getAllPositions(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<PositionInfo>> {
    const info = await this.getOrderlyPositionsInfo(opts)
    const positions = info.rows as API.Position[]
    const accountInfo = await this.getOrderlyAccountInfo(opts)
    const res = await this.signAndSendRequest(
      '/v1/funding_fee/history',
      ['fundingFeeHistory'],
      getStaleTime(CACHE_MINUTE, opts)
    )
    const fundingFees = (await res.json()).data.rows as FundingFeeHistory[]

    const accessibleMargin = await this.getAvailableToTrade(wallet, undefined as any)
    const positionInfo: PositionInfo[] = positions
      .filter((position) => {
        // positions returned from API might have 0 quantity, because they have
        // already been closed, but PnL is unsettled
        return position.position_qty > 0
      })
      .map((position) => {
        const posId = `${position.symbol}-${wallet}`
        const fundingFee = fundingFees.find(({ symbol }) => symbol === position.symbol)
        const rawPnL = position.position_qty * (position.mark_price - position.average_open_price)

        return {
          protocolId: 'ORDERLY',
          marketId: encodeMarketId(orderly.id.toString(), 'ORDERLY', position.symbol),
          posId,
          size: { amount: FixedNumber.fromString(String(position.position_qty)), isTokenAmount: true },
          margin: { amount: FixedNumber.fromString(String(info.margin_ratio)), isTokenAmount: false },
          accessibleMargin,
          avgEntryPrice: FixedNumber.fromString(String(position.average_open_price)),
          cumulativeFunding: fundingFee ? FixedNumber.fromString(String(fundingFee.funding_fee)) : ZERO_FN,
          unrealizedPnl: {
            aggregatePnl: fundingFee ? FixedNumber.fromString(String(rawPnL - fundingFee.funding_fee)) : ZERO_FN,
            rawPnl: FixedNumber.fromString(String(rawPnL)),
            fundingFee: fundingFee ? FixedNumber.fromString(String(fundingFee.funding_fee)) : ZERO_FN,
            borrowFee: ZERO_FN
          },
          liquidationPrice: FixedNumber.fromString(String(position.est_liq_price)),
          leverage: FixedNumber.fromString(String(accountInfo.max_leverage)),
          direction: position.position_qty > 0 ? 'LONG' : 'SHORT',
          collateral: ORDERLY_COLLATERAL_TOKEN,
          indexToken: ORDERLY_COLLATERAL_TOKEN,
          mode: 'CROSS',
          roe: FixedNumber.fromString(String(rawPnL / (position.position_qty * accountInfo.max_leverage))),
          metadata: position
        } satisfies PositionInfo
      })
    return {
      maxItemsCount: positions.length, // no pagination available
      result: positionInfo
    }
  }

  async getAllOrders(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<OrderInfo>> {
    return this.fetchOpenOrders(wallet, undefined, pageOptions, opts)
  }

  async getAllOrdersForPosition(
    wallet: string,
    positionInfo: PositionInfo[],
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<Record<string, PaginatedRes<OrderInfo>>> {
    return Object.fromEntries(
      (
        await Promise.all(
          positionInfo.map((position) => this.fetchOpenOrders(wallet, position.posId, pageOptions, opts))
        )
      ).map((orderInfo, index) => [positionInfo[index].posId, orderInfo])
    )
  }

  getTradesHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<HistoricalTradeInfo>> {
    // TODO /v1/trades
    throw new Error('Method not implemented.')
  }

  async getLiquidationHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<LiquidationInfo>> {
    const res = await this.signAndSendRequest(
      '/v1/liquidations',
      ['liquidations'],
      getStaleTime(CACHE_SECOND * 15, opts),
      opts
    )
    const data = (await res.json()).data as any
    const meta = data.meta as OrderlyPaginationMeta
    const liquidations = data.rows as OrderlyLiquidationInfo[]

    const liquidationInfo: LiquidationInfo[] = []
    liquidations.forEach((liquidation) => {
      liquidation.positions_by_perp.map((liquidatedPosition) => {
        liquidationInfo.push({
          marketId: encodeMarketId(orderly.id.toString(), 'ORDERLY', liquidatedPosition.symbol),
          liquidationPrice: FixedNumber.fromString(String(liquidatedPosition.transfer_price)),
          direction: liquidatedPosition.position_qty > 0 ? 'LONG' : 'SHORT',
          sizeClosed: {
            amount: FixedNumber.fromString(String(liquidatedPosition.position_qty)),
            isTokenAmount: true
          },
          realizedPnl: ZERO_FN, // TODO
          liquidationFees: FixedNumber.fromString(String(liquidatedPosition.abs_liquidator_fee)),
          remainingCollateral: {
            amount: ZERO_FN, // TODO
            isTokenAmount: false
          },
          liqudationLeverage: ZERO_FN, // TODO based on maintenance margin
          timestamp: liquidation.timestamp,
          txHash: undefined,
          collateral: ORDERLY_COLLATERAL_TOKEN,
          id: String(liquidation.liquidation_id)
        })
      })
    })

    return {
      maxItemsCount: liquidations.length,
      result: liquidationInfo
    }
  }

  getClaimHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<ClaimInfo>> {
    // not applicable
    throw new Error('Method not implemented.')
  }

  async getOpenTradePreview(
    wallet: string,
    orderData: CreateOrder[],
    existingPos: (PositionInfo | undefined)[],
    opts?: ApiOpts | undefined
  ): Promise<OpenTradePreviewInfo[]> {
    const positionInfo = await this.getOrderlyPositionsInfo(opts)
    const positions = positionInfo.rows
    const accountInfo = await this.getOrderlyAccountInfo(opts)

    let i = 0
    return Promise.all(
      orderData.map(async (order) => {
        const pos = existingPos[i]
        const isMarket = order.type == 'MARKET'

        const { protocolMarketId } = decodeMarketId(order.marketId)
        const res = await this.signAndSendRequest(
          `/v1/orderbook/${protocolMarketId}`,
          ['orderbook', protocolMarketId],
          getStaleTime(CACHE_SECOND * 5, opts),
          opts
        )
        const obData = (await res.json()).data as OrderbookData

        const triggerPrice = isMarket
          ? order.direction === 'LONG'
            ? obData.asks[0].price
            : obData.bids[0].price
          : order.triggerData!.triggerPrice!.toUnsafeFloat()
        const newOrder = {
          price: triggerPrice,
          qty: order.sizeDelta.amount.toUnsafeFloat(),
          symbol: protocolMarketId
        }

        const leverage = orderHelper.estLeverage({
          totalCollateral: positionInfo.total_collateral_value,
          positions,
          newOrder
        })!

        const { avgExecPrice, remainingSize, priceImpact } = traverseOrderlyBook(
          obData,
          order.sizeDelta.amount.toUnsafeFloat(),
          ORDERLY_TAKER_FEE_BPS,
          order.direction === 'LONG'
        )

        const nextSize = pos
          ? pos.direction === order.direction
            ? pos.size.amount.addFN(order.sizeDelta.amount).abs()
            : pos.size.amount.subFN(order.sizeDelta.amount).abs()
          : order.sizeDelta.amount
        const nextMargin = FixedNumber.fromString(String((nextSize.toUnsafeFloat() * triggerPrice) / leverage))

        const symbolInfos = await this.getOrderlySymbolInfos(opts)
        const symbol = symbolInfos.find((symbol) => symbol.symbol === protocolMarketId)!
        const marketInfos = await this.getOrderlyMarketInfos(opts)
        const market = marketInfos.find((market) => market.symbol === protocolMarketId)!

        const orderFee = orderHelper.orderFee({
          qty: order.sizeDelta.amount.toUnsafeFloat(),
          price: triggerPrice,
          futuresTakeFeeRate: accountInfo.futures_taker_fee_rate / 10_000
        })

        const estLiqPrice = orderHelper.estLiqPrice({
          markPrice: market.mark_price,
          baseIMR: symbol.base_imr,
          baseMMR: symbol.base_mmr,
          totalCollateral: positionInfo.total_collateral_value,
          positions,
          IMR_Factor: symbol.imr_factor,
          orderFee,
          newOrder
        })

        i++
        return {
          marketId: order.marketId,
          collateral: order.collateral,
          leverage: FixedNumber.fromValue(leverage),
          size: toAmountInfoFN(nextSize, true),
          margin: toAmountInfoFN(nextMargin, false),
          avgEntryPrice: FixedNumber.fromValue(
            positions.find((pos) => pos.symbol === protocolMarketId)!.average_open_price
          ),
          liqudationPrice: FixedNumber.fromValue(estLiqPrice),
          fee: FixedNumber.fromValue(orderFee),
          priceImpact,
          isError: false,
          errMsg: ''
        } satisfies OpenTradePreviewInfo
      })
    )
  }

  async getCloseTradePreview(
    wallet: string,
    existingPos: PositionInfo[],
    closePositionData: ClosePositionData[],
    opts?: ApiOpts | undefined
  ): Promise<CloseTradePreviewInfo[]> {
    const positionInfo = await this.getOrderlyPositionsInfo(opts)
    const positions = positionInfo.rows
    const accountInfo = await this.getOrderlyAccountInfo(opts)

    let i = 0
    return Promise.all(
      closePositionData.map(async (closePosition) => {
        const pos = existingPos[i]
        const isMarket = closePosition.type == 'MARKET'

        const { protocolMarketId } = decodeMarketId(pos.marketId)
        const res = await this.signAndSendRequest(
          `/v1/orderbook/${protocolMarketId}`,
          ['orderbook', protocolMarketId],
          getStaleTime(CACHE_SECOND * 5, opts),
          opts
        )
        const obData = (await res.json()).data as OrderbookData

        const triggerPrice = isMarket
          ? pos.direction === 'LONG'
            ? obData.bids[0].price
            : obData.asks[0].price
          : closePosition.triggerData!.triggerPrice!.toUnsafeFloat()
        const newOrder = {
          price: triggerPrice,
          qty: closePosition.closeSize.amount.toUnsafeFloat(),
          symbol: protocolMarketId
        }

        const leverage = orderHelper.estLeverage({
          totalCollateral: positionInfo.total_collateral_value,
          positions,
          newOrder
        })!

        // const { avgExecPrice, remainingSize, priceImpact } = traverseOrderlyBook(
        //   obData,
        //   closePosition.closeSize.amount.toUnsafeFloat(),
        //   ORDERLY_TAKER_FEE_BPS,
        //   pos.direction === 'SHORT'
        // )

        const nextSize = pos.size.amount.subFN(closePosition.closeSize.amount).abs()
        const nextMargin = FixedNumber.fromString(String((nextSize.toUnsafeFloat() * triggerPrice) / leverage))

        const symbolInfos = await this.getOrderlySymbolInfos(opts)
        const symbol = symbolInfos.find((symbol) => symbol.symbol === protocolMarketId)!
        const marketInfos = await this.getOrderlyMarketInfos(opts)
        const market = marketInfos.find((market) => market.symbol === protocolMarketId)!

        const orderFee = orderHelper.orderFee({
          qty: closePosition.closeSize.amount.toUnsafeFloat(),
          price: triggerPrice,
          futuresTakeFeeRate: accountInfo.futures_taker_fee_rate / 10_000
        })

        const estLiqPrice = orderHelper.estLiqPrice({
          markPrice: market.mark_price,
          baseIMR: symbol.base_imr,
          baseMMR: symbol.base_mmr,
          totalCollateral: positionInfo.total_collateral_value,
          positions,
          IMR_Factor: symbol.imr_factor,
          orderFee,
          newOrder
        })

        i++
        return {
          marketId: pos.marketId,
          collateral: pos.collateral,
          leverage: FixedNumber.fromValue(leverage),
          size: toAmountInfoFN(nextSize, true),
          margin: toAmountInfoFN(nextMargin, false),
          avgEntryPrice: FixedNumber.fromValue(
            positions.find((pos) => pos.symbol === protocolMarketId)!.average_open_price
          ),
          liqudationPrice: FixedNumber.fromValue(estLiqPrice),
          fee: FixedNumber.fromValue(orderFee),
          receiveMargin: toAmountInfoFN(ZERO_FN, true),
          isError: false,
          errMsg: ''
        } satisfies CloseTradePreviewInfo
      })
    )
  }

  getUpdateMarginPreview(
    wallet: string,
    isDeposit: boolean[],
    marginDelta: AmountInfo[],
    existingPos: PositionInfo[],
    opts?: ApiOpts | undefined
  ): Promise<PreviewInfo[]> {
    // not applicable
    throw new Error('Method not implemented.')
  }

  getTotalClaimableFunding(wallet: string, opts?: ApiOpts | undefined): Promise<FixedNumber> {
    // not applicable
    throw new Error('Method not implemented.')
  }

  getTotalAccuredFunding(wallet: string, opts?: ApiOpts | undefined): Promise<FixedNumber> {
    // funding fee history
    throw new Error('Method not implemented.')
  }

  async getAccountInfo(wallet: string, opts?: ApiOpts | undefined): Promise<AccountInfo[]> {
    const info = await this.getOrderlyPositionsInfo(opts)
    const positions = info.rows
    const accountInfo = await this.getOrderlyAccountInfo(opts)
    const res = await this.signAndSendRequest(
      '/v1/client/holding',
      ['clientHolding'],
      getStaleTime(CACHE_MINUTE, opts),
      opts
    )
    const holdings = (await res.json()).data.holding as API.Holding[]

    const accountBalance = holdings.find((holding) => holding.token === 'USDC')?.holding ?? 0
    const unsettledPnL = positions.reduce((acc, position) => {
      return acc + position.unsettled_pnl
    }, 0)

    let withdrawable: number
    if (unsettledPnL < 0) {
      withdrawable = info.free_collateral
    } else {
      withdrawable = info.free_collateral + Math.min(0, unsettledPnL)
    }

    return [
      {
        protocolId: 'ORDERLY',
        accountInfoData: {
          accountEquity: FixedNumber.fromString(String(accountBalance + unsettledPnL)),
          totalMarginUsed: ZERO_FN, // TODO position notional / account max leverage
          maintainenceMargin: ZERO_FN, // TODO BTC/ETH 2.75%, alts 5%
          withdrawable: FixedNumber.fromString(String(withdrawable)),
          availableToTrade: FixedNumber.fromString(String(withdrawable)),
          crossAccountLeverage: FixedNumber.fromString(String(accountInfo.max_leverage))
        }
      }
    ]
  }

  getMarketState(wallet: string, marketIds: string[], opts?: ApiOpts | undefined): Promise<MarketState[]> {
    throw new Error('Method not implemented.')
  }

  async getAgentState(wallet: string, agentParams: AgentParams[], opts?: ApiOpts | undefined): Promise<AgentState[]> {
    if (agentParams.length !== 1) throw new Error('agent params should be single item')

    const agent = agentParams[0]

    if (agent.protocolId !== 'ORDERLY') throw new Error('invalid protocol id')
    if (!this.orderlyKey) {
      return [
        {
          agentAddress: agent.agentAddress,
          isAuthenticated: false,
          protocolId: 'ORDERLY'
        }
      ]
    }
    const res = await this.signAndSendRequest(
      '/v1/client/key_info',
      ['clientKeyInfo'],
      getStaleTime(CACHE_MINUTE, opts),
      opts
    )
    // checking `success` is enough, because otherwise the API authentation would have failed already
    const success = (await res.json()).success
    return [
      {
        agentAddress: agent.agentAddress,
        isAuthenticated: success,
        protocolId: 'ORDERLY'
      }
    ]
  }

  async getOrderBooks(
    marketIds: string[],
    precision: (number | undefined)[],
    opts?: ApiOpts | undefined
  ): Promise<OrderBook[]> {
    const orderBooks: OrderBook[] = []
    for (const marketId of marketIds) {
      const { protocolMarketId } = decodeMarketId(marketId)
      const res = await this.signAndSendRequest(
        `/v1/orderbook/${protocolMarketId}`,
        ['orderbook', protocolMarketId],
        getStaleTime(CACHE_SECOND * 5, opts),
        opts
      )
      const precisionOBData: Record<number, OBData> = {}
      const obData = (await res.json()).data as OrderbookData
      let totalSizeAsksToken = 0
      let totalSizeAsksUsd = 0
      let totalSizeBidsToken = 0
      let totalSizeBidsUsd = 0
      // TODO we only send one precision via API. Need to aggregate in the frontend
      precisionOBData[1] = {
        actualPrecision: ZERO_FN, // TODO
        spread: ZERO_FN, // TODO
        spreadPercent: ZERO_FN, // TODO
        asks: obData.asks.map((ask) => {
          totalSizeAsksToken += ask.quantity
          totalSizeAsksUsd += ask.quantity * ask.price
          return {
            price: FixedNumber.fromString(String(ask.price)),
            sizeToken: FixedNumber.fromString(String(ask.quantity)),
            sizeUsd: FixedNumber.fromString(String(ask.quantity * ask.price)),
            totalSizeToken: FixedNumber.fromString(String(totalSizeAsksToken)),
            totalSizeUsd: FixedNumber.fromString(String(totalSizeAsksUsd))
          }
        }),
        bids: obData.asks.map((bid) => {
          totalSizeBidsToken += bid.quantity
          totalSizeBidsUsd += bid.quantity * bid.price
          return {
            price: FixedNumber.fromString(String(bid.price)),
            sizeToken: FixedNumber.fromString(String(bid.quantity)),
            sizeUsd: FixedNumber.fromString(String(bid.quantity * bid.price)),
            totalSizeToken: FixedNumber.fromString(String(totalSizeBidsToken)),
            totalSizeUsd: FixedNumber.fromString(String(totalSizeBidsUsd))
          }
        })
      }
      orderBooks.push({
        marketId,
        actualPrecisionsMap: {}, // TODO
        precisionOBData
      })
    }
    return orderBooks
  }

  private getAccountId(address: string, brokerId: string) {
    const abicoder = AbiCoder.defaultAbiCoder()
    return keccak256(
      abicoder.encode(['address', 'bytes32'], [address, solidityPackedKeccak256(['string'], [brokerId])])
    )
  }

  private getBaseUrl(chainId: number): string {
    switch (chainId) {
      case 10:
      case 42161:
        return 'https://api-evm.orderly.org'
      case 421614:
      case 11155420:
        return 'https://testnet-api-evm.orderly.org'
      default:
        throw new Error('chain ID unsupported')
    }
  }

  private getOffChainDomain(chainId: number): Record<string, any> {
    return {
      name: 'Orderly',
      version: '1',
      chainId,
      verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
    }
  }

  private getOnChainDomain(chainId: number): Record<string, any> {
    return {
      name: 'Orderly',
      version: '1',
      chainId: chainId,
      verifyingContract: this.getVerifyingAddress(this.chainId)
    }
  }

  private getVerifyingAddress(chainId: number): string {
    switch (chainId) {
      case 10:
      case 42161:
        return '0x6F7a338F2aA472838dEFD3283eB360d4Dff5D203'
      case 421614:
      case 11155420:
        return '0x1826B75e2ef249173FC735149AE4B8e9ea10abff'
      default:
        throw new Error('chain ID unsupported')
    }
  }

  private getVaultAddress(chainId: number): string {
    switch (chainId) {
      case 10:
        return '0x816f722424b49cf1275cc86da9840fbd5a6167e9'
      case 42161:
        return '0x816f722424B49Cf1275cc86DA9840Fbd5a6167e9'
      case 421614:
        return '0x0EaC556c0C2321BA25b9DC01e4e3c95aD5CDCd2f'
      case 11155420:
        return '0xEfF2896077B6ff95379EfA89Ff903598190805EC'
      default:
        throw new Error('chain ID unsupported')
    }
  }

  private getUsdcAddress(chainId: number): string {
    switch (chainId) {
      case 10:
        return '0x0b2c639c533813f4aa9d7837caf62653d097ff85'
      case 42161:
        return '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
      case 421614:
        return '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'
      case 11155420:
        return '0x5fd84259d66Cd46123540766Be93DFE6D43130D7'
      default:
        throw new Error('chain ID unsupported')
    }
  }

  public async signAndSendRequest(
    path: string,
    key: string[],
    sTime: number,
    opts?: ApiOpts | undefined,
    init?: RequestInit
  ): Promise<Response> {
    return cacheFetch({
      key: [ORDERLY_CACHE_PREFIX, ...key],
      fn: async () => fetch(`${this.baseUrl}${path}`, await this.getRequestInit(path, init)),
      staleTime: sTime,
      cacheTime: sTime * CACHE_TIME_MULT,
      opts
    })
  }

  private async getRequestInit(path: string, init?: RequestInit): Promise<RequestInit> {
    if (!this.orderlyKey) {
      throw new Error('Orderly key not initialized')
    }
    const timestamp = Date.now()
    const encoder = new TextEncoder()

    let message = `${String(timestamp)}${init?.method ?? 'GET'}${path}`
    if (init?.body) {
      message += init.body
    }
    const orderlySignature = await signAsync(encoder.encode(message), this.orderlyKey)

    return {
      ...(init ?? {}),
      headers: {
        ...(init?.headers ?? {}),
        'Content-Type': init?.method !== 'GET' ? 'application/json' : 'application/x-www-form-urlencoded',
        'orderly-timestamp': String(timestamp),
        'orderly-account-id': this.accountId,
        'orderly-key': `ed25519:${base58.encode(await getPublicKeyAsync(this.orderlyKey))}`,
        'orderly-signature': this.base64EncodeURL(orderlySignature)
      }
    }
  }

  private base64EncodeURL(byteArray: Uint8Array) {
    return btoa(
      Array.from(new Uint8Array(byteArray))
        .map((val) => {
          return String.fromCharCode(val)
        })
        .join('')
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  private async fetchOpenOrders(
    wallet: string,
    symbol?: string,
    pageOptions?: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<OrderInfo>> {
    // assuming orders only means open orders. See https://orderly.network/docs/build-on-evm/evm-api/restful-api/private/get-orders
    // remove this to fetch all historic orders.
    const [meta, orders] = await this.fetchOrders(wallet, 'INCOMPLETE', symbol, pageOptions, opts)

    const orderInfo: OrderInfo[] = orders.map((order) => {
      let sizeDelta: AmountInfo
      if (order.quantity != null) {
        sizeDelta = {
          amount: FixedNumber.fromString(String(order.quantity)),
          isTokenAmount: true
        }
      } else {
        sizeDelta = {
          amount: FixedNumber.fromString(String(order.amount)),
          isTokenAmount: false
        }
      }
      return {
        protocolId: 'ORDERLY',
        marketId: encodeMarketId(orderly.id.toString(), 'ORDERLY', order.symbol),
        direction: order.side === 'BUY' ? 'LONG' : 'SHORT',
        orderId: String(order.order_id),
        orderType: order.type as 'LIMIT' | 'MARKET',
        sizeDelta,
        marginDelta: {
          amount: ZERO_FN,
          isTokenAmount: false
        },
        mode: 'CROSS',
        collateral: ORDERLY_COLLATERAL_TOKEN,
        triggerData: undefined,
        tif: undefined
      } satisfies OrderInfo
    })
    return {
      maxItemsCount: orders.length,
      result: orderInfo
    }
  }

  private async fetchOrders(
    wallet: string,
    status: 'COMPLETE' | 'INCOMPLETE',
    symbol?: string,
    pageOptions?: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<[OrderlyPaginationMeta, API.Order[]]> {
    let query = new URLSearchParams()
    query.append('status', status)
    if (symbol != null) {
      query.append('symbol', symbol)
    }
    if (pageOptions != null) {
      const page = Math.trunc(pageOptions.skip / pageOptions.limit) + 1
      query.append('page', String(page))
      query.append('size', String(pageOptions.limit))
    }
    const queryParams = query.toString()
    const res = await this.signAndSendRequest(
      `/v1/orders${queryParams ? `?${queryParams}` : ''}`,
      [`orders`, queryParams],
      getStaleTime(CACHE_SECOND * 15, opts),
      opts
    )
    const data = (await res.json()).data as any
    const meta = data.meta as OrderlyPaginationMeta
    const orders = data.rows as API.Order[]
    return [meta, orders]
  }

  private async getOrderlySymbolInfos(opts?: ApiOpts) {
    const sTimeFPU = getStaleTime(CACHE_MINUTE * 5, opts)
    return cacheFetch({
      key: [ORDERLY_CACHE_PREFIX, 'getOrderlySymbolInfos'],
      fn: async () => {
        const res = await fetch(`${this.baseUrl}/v1/public/info`)
        return (await res.json()).data.rows as API.Symbol[]
      },
      staleTime: sTimeFPU,
      cacheTime: sTimeFPU * CACHE_TIME_MULT,
      opts
    })
  }

  private async getOrderlyMarketInfos(opts?: ApiOpts) {
    const sTimeFPU = getStaleTime(CACHE_MINUTE, opts)
    return cacheFetch({
      key: [ORDERLY_CACHE_PREFIX, 'getOrderlyMarketInfos'],
      fn: async () => {
        const res = await fetch(`${this.baseUrl}/v1/public/futures`)
        return (await res.json()).data.rows as API.MarketInfo[]
      },
      staleTime: sTimeFPU,
      cacheTime: sTimeFPU * CACHE_TIME_MULT,
      opts
    })
  }

  private async getOrderlyAccountInfo(opts?: ApiOpts) {
    const res = await this.signAndSendRequest('/v1/client/info', ['clientInfo'], getStaleTime(CACHE_MINUTE, opts), opts)
    const accountInfo = (await res.json()).data as API.AccountInfo
    return accountInfo
  }

  private async getOrderlyPositionsInfo(opts?: ApiOpts) {
    const res = await this.signAndSendRequest(
      '/v1/positions',
      ['positions'],
      getStaleTime(CACHE_SECOND * 15, opts),
      opts
    )
    const info = (await res.json()).data as API.PositionInfo
    return info
  }
}
