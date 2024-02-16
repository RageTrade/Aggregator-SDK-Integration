import { getPublicKeyAsync, signAsync, utils } from '@noble/ed25519'
import { Chain, WalletClient } from 'viem'
import { FixedNumber } from '../common/fixedNumber'
import { APICallParamsWithMetadata, ActionParam, RequestSignerFnWithMetadata } from '../interfaces/IActionExecutor'
import {
  AccountInfo,
  AgentParams,
  AgentState,
  AmountInfo,
  ApiOpts,
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
  IRouterAdapterBaseV1,
  IdleMarginInfo,
  LiquidationInfo,
  Market,
  MarketInfo,
  MarketState,
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
  ORDERLY_CREATE_KEY_H,
  ORDERLY_DEPOSIT_H,
  ORDERLY_REGISTER_H,
  ORDERLY_WITHDRAW_H
} from '../common/buttonHeadings'
import base58 from 'bs58'
import { rpc } from '../common/provider'
import { Vault__factory } from '../../typechain/orderly'
import { VaultTypes } from '../../typechain/orderly/Vault'
import { BigNumber } from 'ethers'
import { arbitrum, optimism } from 'viem/chains'
import { API } from '@orderly.network/types'
import { decodeMarketId, encodeMarketId } from '../common/markets'
import { ORDERLY_COLLATERAL_TOKEN, orderly } from '../configs/orderly/config'
import { Token } from '../common/tokens'
import { ZERO_FN } from '../common/constants'

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

  async setup(): Promise<ActionParam[]> {
    return []
  }

  async deposit(params: DepositWithdrawParams[]): Promise<ActionParam[]> {
    const txs: ActionParam[] = []

    for (const { amount, protocol, wallet } of params) {
      if (protocol !== 'ORDERLY') throw new Error('invalid protocol id')

      const provider = rpc[this.chainId]

      const vaultAddress = this.getVaultAddress(this.chainId)
      const vaultContract = Vault__factory.connect(vaultAddress, provider)

      const encoder = new TextEncoder()
      const depositInput = {
        accountId: this.accountId,
        brokerHash: keccak256(encoder.encode(this.brokerId)),
        // if other tokens than USDC need to be supported, we also need decimal metadata for formatting of that token
        tokenHash: keccak256(encoder.encode('USDC')),
        tokenAmount: amount.toFormat(6).value
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
        // TODO is this the same as `value` on `deposit` call?
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

      const nonceRes = await this.signAndSendRequest('/v1/withdraw_nonce')
      const nonceJson = await nonceRes.json()
      const withdrawNonce = nonceJson.data.withdraw_nonce as string

      const withdrawMessage = {
        brokerId: this.brokerId,
        chainId: this.chainId,
        receiver: wallet,
        token: 'USDC',
        amount: amount.toFormat(6).value,
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

  supportedChains(opts?: ApiOpts | undefined): Chain[] {
    return [optimism, arbitrum]
  }

  async supportedMarkets(chains: Chain[] | undefined, opts?: ApiOpts | undefined): Promise<MarketInfo[]> {
    const res = await fetch(`${this.baseUrl}/v1/public/info`)
    const marketInfos = (await res.json()).data.rows as API.Symbol[]
    return marketInfos.map((marketInfo) => {
      const [_, base, quote] = marketInfo.symbol.split('_') // symbols returned from API are always `PERP_<BASE>_<QUOTE>, so base token can be extrated like this

      const market: Market = {
        marketId: encodeMarketId(orderly.id.toString(), 'ORDERLY', marketInfo.symbol),
        chain: orderly, // TODO executed off-chain. Settlement on-chain. Not needed?
        indexToken: this._getPartialToken(quote), // TODO check
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

      const staticMetadata: GenericStaticMarketMetadata = {
        // this is only for symbol. There's also max account leverage
        maxLeverage: FixedNumber.fromString(String(1 / marketInfo.base_imr)),
        minLeverage: FixedNumber.fromString('1'),
        minInitialMargin: FixedNumber.fromString('1'), // TODO check
        minPositionSize: FixedNumber.fromString(String(marketInfo.base_min)),
        maxPrecision: 1, // TODO check
        amountStep: FixedNumber.fromString(String(marketInfo.base_tick)),
        priceStep: FixedNumber.fromString(String(marketInfo.quote_tick))
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
      hasAccount: true, // TODO check
      hasOrderbook: true,
      sizeDeltaInToken: true, // TODO check
      explicitFundingClaim: false,
      collateralDeltaInToken: false, // TODO check
      collateralUsesLimitPricing: false // TODO check
    }
  }

  getAvailableToTrade(
    wallet: string,
    params: AvailableToTradeParams<this['protocolId']>,
    opts?: ApiOpts | undefined
  ): Promise<AmountInfo> {
    throw new Error('Method not implemented.')
  }

  async getMarketPrices(marketIds: string[], opts?: ApiOpts | undefined): Promise<FixedNumber[]> {
    const prices: FixedNumber[] = []

    const res = await fetch(`${this.baseUrl}/v1/public/futures`)
    const marketInfos = (await res.json()).data.rows as API.MarketInfo[]

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

    const res = await fetch(`${this.baseUrl}/v1/public/futures`)
    const marketInfos = (await res.json()).data.rows as API.MarketInfo[]

    marketIds.forEach((mId) => {
      const { protocolMarketId } = decodeMarketId(mId)
      const marketInfo = marketInfos.find(({ symbol }) => symbol === protocolMarketId)
      if (marketInfo == null) return

      const dynamicMetadata: DynamicMarketMetadata = {
        oiLong: FixedNumber.fromString(marketInfo.open_interest), // TODO we don't have long/short breakdown here
        oiShort: FixedNumber.fromString(marketInfo.open_interest), // TODO we don't have long/short breakdown here
        availableLiquidityLong: ZERO_FN, // TODO necessary?
        availableLiquidityShort: ZERO_FN, // TODO necessary?
        longFundingRate: FixedNumber.fromString(String(marketInfo.last_funding_rate)), // TODO how to get long/short
        shortFundingRate: FixedNumber.fromString(String(marketInfo.last_funding_rate)), // TODO how to get long/short
        longBorrowRate: ZERO_FN, // TODO part of funding rate
        shortBorrowRate: ZERO_FN // TODO part of funding rate
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
              order_price: createOrder.triggerData?.triggerPrice,
              order_quantity: createOrder.sizeDelta.isTokenAmount ? createOrder.sizeDelta.amount : undefined,
              order_amount: !createOrder.sizeDelta.isTokenAmount ? createOrder.sizeDelta.amount : undefined,
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
              order_price: updateOrder.triggerData?.triggerPrice,
              order_quantity: updateOrder.sizeDelta.isTokenAmount ? updateOrder.sizeDelta.amount : undefined,
              order_amount: !updateOrder.sizeDelta.isTokenAmount ? updateOrder.sizeDelta.amount : undefined,
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

    // privateKey is assumed to be received in the format `ed25519:<base58 encoded 32 bytes key>`
    // some libraries (like tweetnacl) encode the private key including the seed, which makes it 64 bytes.
    // A library that uses 32 bytes private keys is e.g. @noble/ed25519
    const privateKey = agent.agentAddress
    this.orderlyKey = base58.decode(privateKey.substring(8))
    const orderlyKey = `ed25519:${base58.encode(await getPublicKeyAsync(this.orderlyKey))}`

    const regenerateKey = opts?.orderlyAuth?.regenerateKey ?? false
    const keyExpirationInDays = opts?.orderlyAuth?.keyExpirationInDays ?? 365

    const actions: ActionParam[] = []

    const res = await fetch(`${this.baseUrl}/v1/get_account?address=${this.address}&broker_id=${this.brokerId}`)
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

    if (!regenerateKey && this.orderlyKey != null) {
      return actions
    }

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

  closePosition(
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[],
    wallet: string,
    opts?: ApiOpts | undefined
  ): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
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
    throw new Error('Method not implemented.')
  }

  getAllPositions(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<PositionInfo>> {
    throw new Error('Method not implemented.')
  }

  getAllOrders(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<OrderInfo>> {
    throw new Error('Method not implemented.')
  }

  getAllOrdersForPosition(
    wallet: string,
    positionInfo: PositionInfo[],
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<Record<string, PaginatedRes<OrderInfo>>> {
    throw new Error('Method not implemented.')
  }

  getTradesHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<HistoricalTradeInfo>> {
    throw new Error('Method not implemented.')
  }

  getLiquidationHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<LiquidationInfo>> {
    throw new Error('Method not implemented.')
  }

  getClaimHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<ClaimInfo>> {
    throw new Error('Method not implemented.')
  }

  getOpenTradePreview(
    wallet: string,
    orderData: CreateOrder[],
    existingPos: (PositionInfo | undefined)[],
    opts?: ApiOpts | undefined
  ): Promise<OpenTradePreviewInfo[]> {
    throw new Error('Method not implemented.')
  }

  getCloseTradePreview(
    wallet: string,
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[],
    opts?: ApiOpts | undefined
  ): Promise<CloseTradePreviewInfo[]> {
    throw new Error('Method not implemented.')
  }

  getUpdateMarginPreview(
    wallet: string,
    isDeposit: boolean[],
    marginDelta: AmountInfo[],
    existingPos: PositionInfo[],
    opts?: ApiOpts | undefined
  ): Promise<PreviewInfo[]> {
    throw new Error('Method not implemented.')
  }

  getTotalClaimableFunding(wallet: string, opts?: ApiOpts | undefined): Promise<FixedNumber> {
    throw new Error('Method not implemented.')
  }

  getTotalAccuredFunding(wallet: string, opts?: ApiOpts | undefined): Promise<FixedNumber> {
    throw new Error('Method not implemented.')
  }

  getAccountInfo(wallet: string, opts?: ApiOpts | undefined): Promise<AccountInfo[]> {
    throw new Error('Method not implemented.')
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
    const res = await this.signAndSendRequest('/v1/client/key_info')
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

  getOrderBooks(
    marketIds: string[],
    precision: (number | undefined)[],
    opts?: ApiOpts | undefined
  ): Promise<OrderBook[]> {
    throw new Error('Method not implemented.')
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

  private async signAndSendRequest(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, await this.getRequestInit(path, init))
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

  private _getPartialToken(symbol: string): Token {
    return {
      symbol: symbol,
      name: '',
      decimals: 18,
      address: {
        [arbitrum.id]: undefined,
        [optimism.id]: undefined
      }
    }
  }
}
