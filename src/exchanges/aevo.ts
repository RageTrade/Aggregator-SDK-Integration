import { Chain } from 'viem'
import { FixedNumber, mulFN, addFN } from '../common/fixedNumber'
import { ActionParam } from '../interfaces/IActionExecutor'
import { IAdapterV1, ProtocolInfo } from '../interfaces/V1/IAdapterV1'
import {
  ProtocolId,
  AvailableToTradeParams,
  ApiOpts,
  AmountInfo,
  DepositWithdrawParams,
  MarketInfo,
  DynamicMarketMetadata,
  CreateOrder,
  UpdateOrder,
  CancelOrder,
  AgentParams,
  PositionInfo,
  ClosePositionData,
  UpdatePositionMarginData,
  IdleMarginInfo,
  PageOptions,
  PaginatedRes,
  OrderInfo,
  HistoricalTradeInfo,
  LiquidationInfo,
  ClaimInfo,
  OpenTradePreviewInfo,
  CloseTradePreviewInfo,
  PreviewInfo,
  AccountInfo,
  MarketState,
  AgentState,
  OrderBook,
  Market,
  GenericStaticMarketMetadata,
  Protocol
} from '../interfaces/V1/IRouterAdapterBaseV1'
import { optimism, arbitrum } from 'viem/chains'
import { OpenAPI } from '../../generated/aevo'
import { aevoAddresses } from '../configs/aevo/addresses'
import { L1SocketDepositHelper, L1SocketDepositHelper__factory } from '../../typechain/aevo'
import { rpc } from '../common/provider'
import { Token, tokens } from '../common/tokens'
import { IERC20, IERC20__factory } from '../../typechain/gmx-v1'
import { BigNumber, ethers } from 'ethers'
import { AEVO_DEPOSIT_H, EMPTY_DESC, getApproveTokenHeading } from '../common/buttonHeadings'
import { signRegisterAgent, signRegisterWallet } from '../configs/aevo/signing'

type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any) => any ? K : never
}[keyof T]

type AllowedMethods = FunctionKeys<AevoClient['privateApi']>

export const AEVO_REF_CODE = 'Bitter-Skitter-Lubin'
import { hyperliquid } from '../configs/hyperliquid/api/config'
import { AevoClient } from '../../generated/aevo'
import {
  AEVO_CACHE_PREFIX,
  CACHE_DAY,
  CACHE_MINUTE,
  CACHE_SECOND,
  CACHE_TIME_MULT,
  cacheFetch,
  getStaleTime
} from '../common/cache'
import { AEVO_COLLATERAL_TOKEN, AEVO_TOKENS_MAP, aevo, aevoUpdateTokensMap } from '../configs/aevo/config'
import { encodeMarketId } from '../common/markets'
import { ZERO_FN } from '../common/constants'
import { aevoIndexBasisSlippage, aevoMarketIdToAsset } from '../configs/aevo/helper'
import { aevoCacheGetAllMarkets, aevoCacheGetCoingeckoStats } from '../configs/aevo/aevoCacheHelper'
import { openAevoWssConnection, getAevoWssTicker, getAevoWssOrderBook } from '../configs/aevo/aevoWsClient'

class ExtendedAevoClient extends AevoClient {
  private headers: Record<string, string> & HeadersInit = {
    'Content-Type': 'application/json'
  }

  public setCredentials(apiKey: string, apiSecret: string) {
    if (!apiKey || !apiSecret) throw new Error('key or secret not passed')

    this.headers['AEVO-KEY'] = apiKey
    this.headers['AEVO-SECRET'] = apiSecret
  }

  private _getUrlAndMethod(name: AllowedMethods): { url: string; method: RequestInit['method'] } {
    let method: RequestInit['method']
    let url: string

    switch (true) {
      case name.startsWith('get'):
        method = 'GET'
        url = `/${name.replace(/^get/, '').toLowerCase()}`
        break
      case name.startsWith('post'):
        method = 'POST'
        url = `/${name.replace(/^post/, '').toLowerCase()}`
        break
      case name.startsWith('put'):
        method = 'PUT'
        url = `/${name.replace(/^put/, '').toLowerCase()}`
        break
      case name.startsWith('delete'):
        method = 'DELETE'
        url = `/${name.replace(/^delete/, '').toLowerCase()}`
        break
      default:
        throw new Error('not able to parse method and url')
    }

    return { url, method }
  }

  // helper to infer types since we can't use generated client because fetch needs to be seperate
  public transform<T extends AllowedMethods>(name: T, args: Parameters<AevoClient['privateApi'][T]>[0]) {
    if (!args) throw new Error('request body not passed')

    let { method, url } = this._getUrlAndMethod(name)
    url = OpenAPI.BASE + url

    const body = JSON.stringify(args)

    const params: Parameters<typeof fetch> = [
      url,
      {
        body,
        method,
        headers: this.headers
      }
    ]

    return params
  }
}

export default class AevoAdapterV1 implements IAdapterV1 {
  protocolId: ProtocolId = 'AEVO'

  private static AEVO_GAS_LIMIT = 650_000
  private static AEVO_GAS_LIMIT_WITH_BUFFER = 650_000 + 65_000 // 10% buffer

  public aevoClient = new ExtendedAevoClient()

  public publicApi = this.aevoClient.publicApi
  public privateApi = this.aevoClient.privateApi

  private contracts: Record<Chain['id'], L1SocketDepositHelper> = {
    10: L1SocketDepositHelper__factory.connect(aevoAddresses[optimism.id].socketHelper, rpc[10]),
    42161: L1SocketDepositHelper__factory.connect(aevoAddresses[arbitrum.id].socketHelper, rpc[42161])
  }

  private tokenSpentApprovedMap: Record<string, boolean> = {}

  private lastSig: string = ''
  private lastAddress: `0x${string}` = ethers.constants.AddressZero

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

  async init(wallet: string | undefined, opts?: ApiOpts | undefined): Promise<void> {
    await openAevoWssConnection()
  }

  async setup(): Promise<ActionParam[]> {
    await openAevoWssConnection()
    return Promise.resolve([])
  }

  async _approveIfNeeded(
    wallet: string,
    spender: string,
    amount: bigint,
    chainId: Chain['id'],
    token: { contract: IERC20; data: Token }
  ): Promise<ActionParam | undefined> {
    const key = `${wallet}-${token}-${spender}`
    if (this.tokenSpentApprovedMap[key]) return

    const allowance = await token.contract.allowance(wallet, spender)

    // if allowance is 80% of Max then
    if (allowance.gt(ethers.constants.MaxUint256.mul(8).div(10))) {
      this.tokenSpentApprovedMap[key] = true
    }

    if (allowance.gt(amount)) return

    const tx = await token.contract.populateTransaction.approve(spender, ethers.constants.MaxUint256)

    return {
      tx,
      chainId,
      isUserAction: true,
      heading: getApproveTokenHeading(token.data.symbol),
      desc: EMPTY_DESC
    }
  }

  async _getExtraBridgeFee(chainId: Chain['id'], connector: string) {
    const key = [AEVO_CACHE_PREFIX, 'getExtraBridgeFee', chainId, connector]

    const url = `https://prod.dlapi.socket.tech/estimate-min-fees?srcPlug=${connector}&srcChainSlug=${chainId}&dstChainSlug=2999&msgGasLimit=${AevoAdapterV1.AEVO_GAS_LIMIT_WITH_BUFFER}&dstValue=1`

    return cacheFetch({
      key,
      fn: async () => Number(((await (await fetch(url)).json()) as { status: 'SUCCESS'; result: string }).result),
      staleTime: 5 * CACHE_MINUTE,
      cacheTime: 2 * 5 * CACHE_MINUTE
    })
  }

  async deposit(params: DepositWithdrawParams[]): Promise<ActionParam[]> {
    const payload: ActionParam[] = []

    for (const each of params) {
      // check if token is eth or not
      const isNativeETH = each.token.symbol === tokens.ETH.symbol

      // get gas price
      const connector = aevoAddresses[each.chainId].connector[isNativeETH ? 'WETH' : each.token.symbol]
      const additional = BigNumber.from(await this._getExtraBridgeFee(each.chainId, connector))

      const amount = each.amount.toFormat(each.token.decimals).value

      const ethRequired = isNativeETH ? additional.add(amount) : additional

      if (isNativeETH) {
        const tx = await this.contracts[each.chainId].populateTransaction.depositETHToAppChain(
          each.wallet,
          amount,
          AevoAdapterV1.AEVO_GAS_LIMIT,
          aevoAddresses[each.chainId].connector['WETH'],
          '0x',
          {
            value: ethRequired
          }
        )

        payload.push({
          tx,
          ethRequired,
          desc: EMPTY_DESC,
          isUserAction: true,
          chainId: each.chainId,
          isAgentRequired: false,
          heading: AEVO_DEPOSIT_H
        })

        continue
      }

      if (each.protocol !== 'AEVO') throw new Error('invalid protocol id')

      const address = each.token.address[each.chainId]

      if (!address || address === ethers.constants.AddressZero) throw new Error('token address not found')

      if (!aevoAddresses[each.chainId].vault || !this.contracts[each.chainId]) throw new Error('token not supported')

      const contract = IERC20__factory.connect(address, rpc[each.chainId])

      // approve if required
      const approval = await this._approveIfNeeded(
        each.wallet,
        this.contracts[each.chainId].address,
        amount,
        each.chainId,
        { contract, data: each.token }
      )

      if (approval) payload.push(approval)

      // deposit
      const tx = await this.contracts[each.chainId].populateTransaction.depositToAppChain(
        each.wallet,
        address,
        amount,
        AevoAdapterV1.AEVO_GAS_LIMIT,
        aevoAddresses[each.chainId].connector[each.token.symbol],
        '0x',
        {
          value: ethRequired
        }
      )

      payload.push({
        tx,
        ethRequired,
        desc: EMPTY_DESC,
        isUserAction: true,
        chainId: each.chainId,
        isAgentRequired: false,
        heading: AEVO_DEPOSIT_H
      })
    }

    return payload
  }

  // to maintain context while registering since it request sign from owner & burner
  _getSigKey() {
    if (!this.lastSig || !this.lastAddress || this.lastAddress == ethers.constants.AddressZero)
      throw new Error('invalid sig state')

    return {
      sig: this.lastSig,
      key: this.lastAddress
    }
  }

  // sets interim sig from agent wallet
  _setSig(key: `0x${string}`, sig: `0x${string}`) {
    this.lastSig = sig
    this.lastAddress = key

    if (!this.lastSig || !this.lastAddress || this.lastAddress == ethers.constants.AddressZero)
      throw new Error('invalid sig state')
  }

  // to pass opts to set keys from local storage
  // should be set where private apis are used
  _setCredentials(opts: ApiOpts, strict: boolean) {
    if (opts && opts.aevoAuth) {
      this.aevoClient.setCredentials(opts.aevoAuth.apiKey, opts.aevoAuth.secret)
    } else if (strict) throw new Error('missing aevo credentials')
  }

  // onboarding & setting referral code
  // called from write functions and authenticateAgent
  async _register(wallet: `0x${string}`): Promise<ActionParam[]> {
    const payload: ActionParam[] = []

    payload.push(signRegisterAgent(this, wallet))
    payload.push(signRegisterWallet(this))

    return payload
  }

  withdraw(params: DepositWithdrawParams[]): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }

  supportedChains(opts?: ApiOpts | undefined): Chain[] {
    return [aevo]
  }

  async supportedMarkets(chains: Chain[] | undefined, opts?: ApiOpts | undefined): Promise<MarketInfo[]> {
    let marketInfo: MarketInfo[] = []

    if (chains == undefined || chains.includes(hyperliquid)) {
      const sTimeMarkets = getStaleTime(CACHE_DAY, opts)
      const allMarkets = (
        await aevoCacheGetAllMarkets(this.publicApi, sTimeMarkets, sTimeMarkets * CACHE_TIME_MULT, opts)
      ).filter((m) => m.is_active)

      allMarkets.forEach((m) => {
        const market: Market = {
          marketId: encodeMarketId(aevo.id.toString(), this.protocolId, m.underlying_asset),
          chain: aevo,
          indexToken: AEVO_TOKENS_MAP[m.underlying_asset],
          longCollateral: [AEVO_COLLATERAL_TOKEN],
          shortCollateral: [AEVO_COLLATERAL_TOKEN],
          supportedModes: {
            ISOLATED: false,
            CROSS: true
          },
          supportedOrderTypes: {
            LIMIT: true,
            MARKET: true,
            STOP_LOSS: true,
            TAKE_PROFIT: true,
            STOP_LOSS_LIMIT: true,
            TAKE_PROFIT_LIMIT: true
          },
          supportedOrderActions: {
            CREATE: true,
            UPDATE: true,
            CANCEL: true
          },
          marketSymbol: m.underlying_asset
        }

        const staticMetadata: GenericStaticMarketMetadata = {
          maxLeverage: FixedNumber.fromString(m.max_leverage!),
          minLeverage: FixedNumber.fromString('1'),
          minInitialMargin: FixedNumber.fromString('1'),
          minPositionSize: FixedNumber.fromString(m.min_order_value),
          maxPrecision: 1,
          amountStep: FixedNumber.fromString(m.amount_step),
          priceStep: FixedNumber.fromString(m.price_step)
        }

        const protocol: Protocol = {
          protocolId: 'AEVO'
        }

        marketInfo.push({
          ...market,
          ...staticMetadata,
          ...protocol
        })
      })
    }

    return marketInfo
  }

  async getMarketPrices(marketIds: string[], opts?: ApiOpts | undefined): Promise<FixedNumber[]> {
    const assets = marketIds.map((mId) => aevoMarketIdToAsset(mId))
    const cachedTickers = assets.map((a) => getAevoWssTicker(a))

    if (!cachedTickers.includes(undefined)) {
      // return from cache
      return cachedTickers.map((t) => FixedNumber.fromString(t!.mark.price))
    } else {
      // get from allMarkets Api
      const sTimePrices = getStaleTime(CACHE_SECOND * 2, opts)
      const allMarkets = (await aevoCacheGetAllMarkets(this.publicApi, sTimePrices, sTimePrices, opts)).filter(
        (m) => m.is_active
      )

      return marketIds.map((marketId) => {
        const market = allMarkets.find((m) => m.underlying_asset == aevoMarketIdToAsset(marketId))
        return market ? FixedNumber.fromString(market.mark_price) : ZERO_FN
      })
    }
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
    let dynamicMarketMetadata: DynamicMarketMetadata[] = []

    const assets = marketIds.map((mId) => aevoMarketIdToAsset(mId))
    const cachedTickers = assets.map((a) => getAevoWssTicker(a))
    // count liquidity till LIQUIDITY_SLIPPAGE in bps
    const LIQUIDITY_SLIPPAGE = '100'

    // TODO - turn on when funding rate from cache is resolved
    // if (!cachedTickers.includes(undefined)) {
    //   // return from cache
    //   cachedTickers.forEach((t) => {
    //     const oiToken = FixedNumber.fromString(t!.open_interest)
    //     const iPrice = FixedNumber.fromString(t!.index_price)
    //     const oiUsd = oiToken.mulFN(iPrice).divFN(FixedNumber.fromString('2'))
    //     const fundingRate = FixedNumber.fromString(t!.funding_rate)

    //     dynamicMarketMetadata.push({
    //       oiLong: oiUsd,
    //       oiShort: oiUsd,
    //       availableLiquidityLong: ZERO_FN, // TODO - availableLiquidity from OB
    //       availableLiquidityShort: ZERO_FN, // TODO - availableLiquidity from OB
    //       longFundingRate: fundingRate.mulFN(FixedNumber.fromString('-1')),
    //       shortFundingRate: fundingRate,
    //       longBorrowRate: ZERO_FN,
    //       shortBorrowRate: ZERO_FN
    //     })
    //   })
    // } else {
    // get from CoingeckoStats Api
    const sTimeCS = getStaleTime(CACHE_SECOND * 10, opts)
    const cgStats = await aevoCacheGetCoingeckoStats(this.publicApi, sTimeCS, sTimeCS * CACHE_TIME_MULT, opts)

    for (let i = 0; i < marketIds.length; i++) {
      const mId = marketIds[i]
      const asset = aevoMarketIdToAsset(mId)
      const cgStat = cgStats.find((cg) => cg.base_currency === asset)

      if (cgStat) {
        const oiToken = FixedNumber.fromString(cgStat.open_interest!)
        const iPrice = FixedNumber.fromString(cgStat.index_price!)
        const oiUsd = oiToken.mulFN(iPrice).divFN(FixedNumber.fromString('2'))
        const fundingRate = FixedNumber.fromString(cgStat.funding_rate!)

        const cachedOB = getAevoWssOrderBook(asset)
        const ob = cachedOB ? cachedOB : await this.publicApi.getOrderbook(`${asset}-PERP`)

        let bids = ob.bids!
        let asks = ob.asks!

        bids = bids.slice(0, aevoIndexBasisSlippage(bids, LIQUIDITY_SLIPPAGE))
        asks = asks.slice(0, aevoIndexBasisSlippage(asks, LIQUIDITY_SLIPPAGE))

        // long liquidity is the total available asks (sell orders) in the book
        const longLiquidity = asks.reduce((acc, ask) => {
          return addFN(acc, mulFN(FixedNumber.fromString(ask[0]), FixedNumber.fromString(ask[1])))
        }, FixedNumber.fromString('0'))
        // short liquidity is the total available bids (buy orders) in the book
        const shortLiquidity = bids.reduce((acc, bid) => {
          return addFN(acc, mulFN(FixedNumber.fromString(bid[0]), FixedNumber.fromString(bid[1])))
        }, FixedNumber.fromString('0'))

        dynamicMarketMetadata.push({
          oiLong: oiUsd,
          oiShort: oiUsd,
          availableLiquidityLong: longLiquidity,
          availableLiquidityShort: shortLiquidity,
          longFundingRate: fundingRate.mulFN(FixedNumber.fromString('-1')),
          shortFundingRate: fundingRate,
          longBorrowRate: ZERO_FN,
          shortBorrowRate: ZERO_FN
        })
      } else {
        throw new Error(`No stats found for asset ${asset}`)
      }
    }

    return dynamicMarketMetadata
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

  /// Internal helper functions ///
}
