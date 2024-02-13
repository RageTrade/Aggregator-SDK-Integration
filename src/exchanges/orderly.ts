import { getPublicKeyAsync, signAsync, utils } from '@noble/ed25519'
import { Chain, WalletClient } from 'viem'
import { FixedNumber } from '../common/fixedNumber'
import { ActionParam, RequestSignerFnWithMetadata } from '../interfaces/IActionExecutor'
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
  HistoricalTradeInfo,
  IRouterAdapterBaseV1,
  IdleMarginInfo,
  LiquidationInfo,
  MarketInfo,
  MarketState,
  OpenTradePreviewInfo,
  OrderBook,
  OrderInfo,
  PageOptions,
  PaginatedRes,
  PositionInfo,
  PreviewInfo,
  ProtocolId,
  SetupOpts,
  UpdateOrder,
  UpdatePositionMarginData
} from '../interfaces/V1/IRouterAdapterBaseV1'
import { IAdapterV1, ProtocolInfo } from '../interfaces/V1/IAdapterV1'
import { AbiCoder, encodeBase58, keccak256, solidityPackedKeccak256 } from 'ethers-v6'
import {
  EMPTY_DESC,
  ORDERLY_CREATE_KEY_H,
  ORDERLY_DEPOSIT_H,
  ORDERLY_REGISTER_H,
  ORDERLY_WITHDRAW_H
} from '../common/buttonHeadings'
import { ORDERLY_KEY_PREFIX_STORAGE } from '../common/localStorage'
import base58 from 'bs58'
import { rpc } from '../common/provider'
import { Vault__factory } from '../../typechain/orderly'
import { VaultTypes } from '../../typechain/orderly/Vault'
import { BigNumber } from 'ethers'
import { arbitrum, optimism } from 'viem/chains'

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

  async setup(opts?: SetupOpts): Promise<ActionParam[]> {
    if (!opts) throw new Error('setup options required')
    if (opts.protocolId !== 'ORDERLY') throw new Error('invalid protocol id')

    const actions: ActionParam[] = []

    const regenerateKey = opts.data.regenerateKey ?? false
    const keyExpirationInDays = opts.data.keyExpirationInDays ?? 365

    const res = await fetch(`${this.baseUrl}/v1/get_account?address=${this.address}&broker_id=${this.brokerId}`)
    const getAccount: { success: boolean } = await res.json()
    if (!getAccount.success) {
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
          return {
            fetchParams: [
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
          }
        },
        isEoaSigner: true,
        isAgentRequired: false
      } satisfies RequestSignerFnWithMetadata)
    }

    this.orderlyKey = this.loadOrderlyKey()
    if (!regenerateKey && this.orderlyKey != null) {
      return actions
    }

    const privateKey = utils.randomPrivateKey()
    const orderlyKey = `ed25519:${encodeBase58(await getPublicKeyAsync(privateKey))}`
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
        return {
          fetchParams: [
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
          ],
          onSuccess: () => {
            this.saveOrderlyKey(orderlyKey)
          }
        }
      },
      isEoaSigner: true,
      isAgentRequired: false
    } satisfies RequestSignerFnWithMetadata)
    return actions
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

      const nonceRes = await this.signAndSendRequest(
        this.accountId,
        this.orderlyKey,
        `${this.baseUrl}/v1/withdraw_nonce`
      )
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
          return {
            fetchParams: [
              `${this.baseUrl}/v1/withdraw_request`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'orderly-timestamp': String(timestamp),
                  'orderly-account-id': this.accountId,
                  'orderly-key': `ed25519:${encodeBase58(await getPublicKeyAsync(this.orderlyKey))}`,
                  'orderly-signature': this.base64EncodeURL(orderlySignature)
                },
                body
              }
            ]
          }
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
    throw new Error('Method not implemented.')
  }

  getProtocolInfo(): ProtocolInfo {
    throw new Error('Method not implemented.')
  }

  getAvailableToTrade(
    wallet: string,
    params: AvailableToTradeParams<this['protocolId']>,
    opts?: ApiOpts | undefined
  ): Promise<AmountInfo> {
    throw new Error('Method not implemented.')
  }

  getMarketPrices(marketIds: string[], opts?: ApiOpts | undefined): Promise<FixedNumber[]> {
    throw new Error('Method not implemented.')
  }

  getMarketsInfo(marketIds: string[], opts?: ApiOpts | undefined): Promise<MarketInfo[]> {
    throw new Error('Method not implemented.')
  }

  getDynamicMarketMetadata(marketIds: string[], opts?: ApiOpts | undefined): Promise<DynamicMarketMetadata[]> {
    throw new Error('Method not implemented.')
  }

  increasePosition(orderData: CreateOrder[], wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }

  updateOrder(orderData: UpdateOrder[], wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }

  cancelOrder(orderData: CancelOrder[], wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }

  authenticateAgent(agentParams: AgentParams[], wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
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

  getAgentState(wallet: string, agentParams: AgentParams[], opts?: ApiOpts | undefined): Promise<AgentState[]> {
    throw new Error('Method not implemented.')
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

  private loadOrderlyKey(): Uint8Array | undefined {
    if (!window.localStorage) return
    const key = window.localStorage.getItem(`${ORDERLY_KEY_PREFIX_STORAGE}:${this.accountId}`)
    if (!key) return
    return base58.decode(key.substring(6))
  }

  private saveOrderlyKey(key: string) {
    if (!window.localStorage) return
    window.localStorage.setItem(`${ORDERLY_KEY_PREFIX_STORAGE}:${this.accountId}`, key)
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

  private async signAndSendRequest(
    orderlyAccountId: string,
    privateKey: Uint8Array | string,
    input: URL | string,
    init?: RequestInit | undefined
  ): Promise<Response> {
    const timestamp = Date.now()
    const encoder = new TextEncoder()

    const url = new URL(input)
    let message = `${String(timestamp)}${init?.method ?? 'GET'}${url.pathname}`
    if (init?.body) {
      message += init.body
    }
    const orderlySignature = await signAsync(encoder.encode(message), privateKey)

    return fetch(input, {
      ...(init ?? {}),
      headers: {
        ...(init?.headers ?? {}),
        'Content-Type': init?.method !== 'GET' ? 'application/json' : 'application/x-www-form-urlencoded',
        'orderly-timestamp': String(timestamp),
        'orderly-account-id': orderlyAccountId,
        'orderly-key': `ed25519:${encodeBase58(await getPublicKeyAsync(privateKey))}`,
        'orderly-signature': Buffer.from(orderlySignature).toString('base64url')
      }
    })
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
}
