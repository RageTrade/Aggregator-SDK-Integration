import type { BigNumber } from 'ethers'
import type { Chain } from 'viem'
import { arbitrum, optimism } from 'viem/chains'

import { FixedNumber } from '../fixedNumber'
import { getPythBars, getTokenPriceD, subscribeOnStream, unsubscribeFromStream } from '../pyth'
import { errorCatcher } from '../src/common/errors'
import { getPaginatedResponse } from '../src/common/helper'
import { decodeMarketId } from '../src/common/markets'
import { protocols } from '../src/common/protocols'
import type { Token } from '../src/common/tokens'
import { subscribeAevoCandles, unSubscribeAevoCandles } from '../src/configs/aevo'
import { subscribeHLCandles, unSubscribeHLCandles } from '../src/configs/hyperliquid'
import { AevoAdapterV1 } from '../src/exchanges/aevo'
import { GmxV2Service } from '../src/exchanges/gmxv2'
import { HyperliquidAdapterV1 } from '../src/exchanges/hyperliquid'
import { ReyaAdapterV1 } from '../src/exchanges/reya'
import type { ActionParam } from '../src/interfaces/IActionExecutor'
import type { GetBarsParams, IAdapterV1, ProtocolInfo, TVBar } from '../src/interfaces/V1/IAdapterV1'
import type {
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
  HistoricalTradeInfo,
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
  PositionData,
  PositionInfo,
  PreviewInfo,
  Protocol,
  ProtocolId,
  SubscribeCandleArgs,
  UpdateOrder,
  UpdatePositionMarginData
} from '../src/interfaces/V1/IRouterAdapterBaseV1'
import type { IRouterV1 } from '../src/interfaces/V1/IRouterV1'

export default class RouterV1 implements IRouterV1 {
  adapters: Record<string, IAdapterV1> = {}

  _checkAndGetAdapter(marketId: Market['marketId']) {
    const { protocolId } = decodeMarketId(marketId)
    const adapter = this.adapters[protocolId]
    if (!adapter) throw new Error(`Protocol ${protocolId} not supported`)
    return adapter
  }

  constructor() {
    this.adapters[protocols.GMXV2.symbol] = new GmxV2Service()
    this.adapters[protocols.HYPERLIQUID.symbol] = new HyperliquidAdapterV1()
    this.adapters[protocols.AEVO.symbol] = new AevoAdapterV1()
    // this.adapters[protocols.SYNFUTURES.symbol] = new SynFuturesAdapterV1()
    // this.adapters[protocols.PERENNIAL.symbol] = new PerennialAdapter(perennialSdk)
    // this.adapters[protocols.ORDERLY.symbol] = new OrderlyAdapterV1()
    this.adapters[protocols.REYA.symbol] = new ReyaAdapterV1()
  }

  clearCredentials<T extends ProtocolId>(protocol: T) {
    this.adapters[protocol].clearCredentials()
  }

  async setCredentials<T extends ProtocolId>(protocol: T, credentials: AuthParams<T>) {
    return this.adapters[protocol].setCredentials(credentials)
  }

  async deposit(params: DepositWithdrawParams[]): Promise<ActionParam[]> {
    const promises: Promise<ActionParam[] | undefined>[] = []

    params.forEach((param) => {
      const adapter = this.adapters[param.protocol]
      promises.push(errorCatcher(() => adapter.deposit([param])))
    })

    const out = (await Promise.all(promises)).filter((v) => !!v) as ActionParam[][]
    return out.flat()
  }

  async withdraw(params: DepositWithdrawParams[]): Promise<ActionParam[]> {
    const promises: Promise<ActionParam[] | undefined>[] = []

    params.forEach((param) => {
      const adapter = this.adapters[param.protocol]
      promises.push(errorCatcher(() => adapter.withdraw([param])))
    })

    const out = (await Promise.all(promises)).filter((v) => !!v) as ActionParam[][]
    return out.flat()
  }

  getProtocolInfo(): (Protocol & ProtocolInfo)[] {
    const res: (Protocol & ProtocolInfo)[] = []

    for (const key in this.adapters) {
      res.push({
        ...this.adapters[key].getProtocolInfo(),
        protocolId: this.adapters[key].protocolId
      })
    }

    return res
  }

  async getAvailableToTrade<T extends ProtocolId>(
    protocol: T,
    wallet: string,
    params: AvailableToTradeParams<T>,
    opts?: ApiOpts
  ) {
    const adapter = this.adapters[protocol]
    const out = adapter.getAvailableToTrade(wallet, params, opts)

    return out
  }

  async getClaimHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts
  ): Promise<PaginatedRes<ClaimInfo>> {
    const promises: Promise<PaginatedRes<ClaimInfo> | undefined>[] = []
    const result: ClaimInfo[] = []

    for (const key in this.adapters) {
      promises.push(errorCatcher(() => this.adapters[key].getClaimHistory(wallet, undefined, opts)))
    }

    const out = (await Promise.all(promises)).filter((v) => !!v) as PaginatedRes<ClaimInfo>[]
    out.forEach((res) => {
      result.push(...res.result)
    })

    return getPaginatedResponse(result, pageOptions)
  }

  async init(swAddr: string | undefined, opts?: ApiOpts): Promise<void> {
    const initPromises: Promise<void>[] = []
    for (const key in this.adapters) {
      initPromises.push(errorCatcher(() => this.adapters[key].init(swAddr, opts)))
    }
    await Promise.all(initPromises)
    return Promise.resolve()
  }

  supportedProtocols(): Protocol[] {
    const protocolKeys = Object.keys(this.adapters)
    const out = protocolKeys.map((key) => {
      return {
        protocolId: key
      } as Protocol
    })

    return out
  }

  supportedChains(opts?: ApiOpts): Chain[] {
    return [arbitrum, optimism]
  }

  async supportedMarkets(chains: Chain[] | undefined, opts?: ApiOpts): Promise<MarketInfo[]> {
    const marketInfoPromises: Promise<MarketInfo[] | undefined>[] = []
    for (const key in this.adapters) {
      marketInfoPromises.push(errorCatcher(() => this.adapters[key].supportedMarkets(chains, opts)))
    }

    const out = (await Promise.all(marketInfoPromises)).filter((v) => !!v) as MarketInfo[][]
    return out.flat()
  }
  async getMarketPrices(marketIds: Market['marketId'][], opts?: ApiOpts): Promise<FixedNumber[]> {
    const promises: Promise<FixedNumber[] | undefined>[] = []
    for (const marketId of marketIds) {
      const adapter = this._checkAndGetAdapter(marketId)
      promises.push(errorCatcher(() => adapter.getMarketPrices([marketId], opts)))
    }
    const out = (await Promise.all(promises)).filter((v) => !!v) as FixedNumber[][]
    return out.flat()
  }
  async getMarketsInfo(marketIds: Market['marketId'][], opts?: ApiOpts): Promise<MarketInfo[]> {
    const promises = []
    for (const marketId of marketIds) {
      const adapter = this._checkAndGetAdapter(marketId)
      promises.push(errorCatcher(() => adapter.getMarketsInfo([marketId], opts)))
    }
    const out = (await Promise.all(promises)).filter((v) => !!v) as MarketInfo[][]
    return out.flat()
  }
  async getMarketState(wallet: string, marketIds: string[], opts?: ApiOpts | undefined): Promise<MarketState[]> {
    const promises = []
    for (const marketId of marketIds) {
      const adapter = this._checkAndGetAdapter(marketId)
      promises.push(errorCatcher(() => adapter.getMarketState(wallet, [marketId], opts)))
    }
    const out = (await Promise.all(promises)).filter((v) => !!v) as MarketState[][]
    return out.flat()
  }
  async getAgentState(wallet: string, agentParams: AgentParams[], opts?: ApiOpts): Promise<AgentState[]> {
    const promises = []

    for (const each of agentParams) {
      const adapter = this.adapters[each.protocolId]
      promises.push(errorCatcher(() => adapter.getAgentState(wallet, [each], opts)))
    }

    const out = (await Promise.all(promises)).filter((v) => !!v) as AgentState[][]
    return out.flat()
  }
  async getDynamicMarketMetadata(marketIds: Market['marketId'][], opts?: ApiOpts): Promise<DynamicMarketMetadata[]> {
    const promises = []
    for (const marketId of marketIds) {
      const adapter = this._checkAndGetAdapter(marketId)
      promises.push(errorCatcher(() => adapter.getDynamicMarketMetadata([marketId], opts)))
    }
    const out = (await Promise.all(promises)).filter((v) => !!v) as DynamicMarketMetadata[][]
    return out.flat()
  }
  async increasePosition(orderData: CreateOrder[], wallet: string, opts?: ApiOpts): Promise<ActionParam[]> {
    const promises = []
    for (const order of orderData) {
      const adapter = this._checkAndGetAdapter(order.marketId)
      promises.push(errorCatcher(() => adapter.increasePosition([order], wallet, opts)))
    }
    const out = (await Promise.all(promises)).filter((v) => !!v) as ActionParam[][]
    return out.flat()
  }
  async updateOrder(orderData: UpdateOrder[], wallet: string, opts?: ApiOpts): Promise<ActionParam[]> {
    const promises = []
    for (const order of orderData) {
      const adapter = this._checkAndGetAdapter(order.marketId)
      promises.push(errorCatcher(() => adapter.updateOrder([order], wallet, opts)))
    }
    const out = (await Promise.all(promises)).filter((v) => !!v) as ActionParam[][]
    return out.flat()
  }
  async cancelOrder(orderData: CancelOrder[], wallet: string, opts?: ApiOpts): Promise<ActionParam[]> {
    const promises = []
    for (const order of orderData) {
      const adapter = this._checkAndGetAdapter(order.marketId)
      promises.push(errorCatcher(() => adapter.cancelOrder([order], wallet, opts)))
    }
    const out = (await Promise.all(promises)).filter((v) => !!v) as ActionParam[][]
    return out.flat()
  }
  async closePosition(
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[],
    wallet: string,
    opts?: ApiOpts
  ): Promise<ActionParam[]> {
    const promises: Promise<ActionParam[] | undefined>[] = []
    positionInfo.forEach((position, index) => {
      const adapter = this._checkAndGetAdapter(position.marketId)
      promises.push(errorCatcher(() => adapter.closePosition([position], [closePositionData[index]], wallet, opts)))
    })
    const out = (await Promise.all(promises)).filter((v) => !!v) as ActionParam[][]
    return out.flat()
  }
  async authenticateAgent(agentParams: AgentParams[], wallet: string, opts?: ApiOpts): Promise<ActionParam[]> {
    const promises: Promise<ActionParam[] | undefined>[] = []

    agentParams.forEach((agent, index) => {
      const adapter = this.adapters[agentParams[index].protocolId]
      promises.push(errorCatcher(() => adapter.authenticateAgent([agent], wallet, opts)))
    })

    const out = (await Promise.all(promises)).filter((v) => !!v) as ActionParam[][]
    return out.flat()
  }
  async updatePositionMargin(
    positionInfo: PositionInfo[],
    updatePositionMarginData: UpdatePositionMarginData[],
    wallet: string,
    opts?: ApiOpts
  ): Promise<ActionParam[]> {
    const promises: Promise<ActionParam[] | undefined>[] = []
    positionInfo.forEach((position, index) => {
      const adapter = this._checkAndGetAdapter(position.marketId)
      promises.push(
        errorCatcher(() => adapter.updatePositionMargin([position], [updatePositionMarginData[index]], wallet, opts))
      )
    })
    const out = (await Promise.all(promises)).filter((v) => !!v) as ActionParam[][]
    return out.flat()
  }
  async claimFunding(wallet: string, opts?: ApiOpts): Promise<ActionParam[]> {
    const claimPromises: Promise<ActionParam[] | undefined>[] = []
    for (const key in this.adapters) {
      claimPromises.push(errorCatcher(() => this.adapters[key].claimFunding(wallet, opts)))
    }
    const out = (await Promise.all(claimPromises)).filter((v) => !!v) as ActionParam[][]
    return out.flat()
  }
  async getIdleMargins(wallet: string, opts?: ApiOpts): Promise<Array<IdleMarginInfo>> {
    const promises: Promise<Array<IdleMarginInfo> | undefined>[] = []
    for (const key in this.adapters) {
      promises.push(errorCatcher(() => this.adapters[key].getIdleMargins(wallet, opts)))
    }
    const out = (await Promise.all(promises)).filter((v) => !!v) as Array<IdleMarginInfo>[]
    return out.flat()
  }
  async getAllPositions(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts
  ): Promise<PaginatedRes<PositionInfo>> {
    const promises: Promise<PaginatedRes<PositionInfo> | undefined>[] = []
    const result: PositionInfo[] = []

    for (const key in this.adapters) {
      promises.push(errorCatcher(() => this.adapters[key].getAllPositions(wallet, undefined, opts)))
    }

    const out = (await Promise.all(promises)).filter((v) => !!v) as PaginatedRes<PositionInfo>[]

    out.forEach((res) => {
      result.push(...res.result)
    })

    return getPaginatedResponse(result, pageOptions)
  }
  async getAllOrders(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts
  ): Promise<PaginatedRes<OrderInfo>> {
    const promises: Promise<PaginatedRes<OrderInfo> | undefined>[] = []
    const result: OrderInfo[] = []

    for (const key in this.adapters) {
      promises.push(errorCatcher(() => this.adapters[key].getAllOrders(wallet, undefined, opts)))
    }

    const out = (await Promise.all(promises)).filter((v) => !!v) as PaginatedRes<OrderInfo>[]
    out.forEach((res) => {
      result.push(...res.result)
    })

    return getPaginatedResponse(result, pageOptions)
  }

  async getAllOrdersForPosition(
    wallet: string,
    positionInfo: PositionInfo[],
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts
  ): Promise<Record<PositionData['posId'], PaginatedRes<OrderInfo>>> {
    const promises: Promise<Record<PositionData['posId'], PaginatedRes<OrderInfo>> | undefined>[] = []
    const result: Record<PositionData['posId'], PaginatedRes<OrderInfo>> = {}

    for (const position of positionInfo) {
      const adapter = this._checkAndGetAdapter(position.marketId)
      promises.push(errorCatcher(() => adapter.getAllOrdersForPosition(wallet, [position], pageOptions, opts)))
    }

    const out = (await Promise.all(promises)).filter((v) => !!v) as Record<
      PositionData['posId'],
      PaginatedRes<OrderInfo>
    >[]
    out.forEach((res) => {
      for (const key in res) {
        result[key] = res[key]
      }
    })

    return result
  }

  async getTradesHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts
  ): Promise<PaginatedRes<HistoricalTradeInfo>> {
    const promises: Promise<PaginatedRes<HistoricalTradeInfo> | undefined>[] = []
    const result: HistoricalTradeInfo[] = []

    for (const key in this.adapters) {
      promises.push(errorCatcher(() => this.adapters[key].getTradesHistory(wallet, undefined, opts)))
    }

    const out = (await Promise.all(promises)).filter((v) => !!v) as PaginatedRes<HistoricalTradeInfo>[]
    out.forEach((res) => {
      result.push(...res.result)
    })

    return getPaginatedResponse(result, pageOptions)
  }
  async getLiquidationHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts
  ): Promise<PaginatedRes<LiquidationInfo>> {
    const promises: Promise<PaginatedRes<LiquidationInfo> | undefined>[] = []
    const result: LiquidationInfo[] = []

    for (const key in this.adapters) {
      promises.push(errorCatcher(() => this.adapters[key].getLiquidationHistory(wallet, undefined, opts)))
    }

    const out = (await Promise.all(promises)).filter((v) => !!v) as PaginatedRes<LiquidationInfo>[]
    out.forEach((res) => {
      result.push(...res.result)
    })

    return getPaginatedResponse(result, pageOptions)
  }
  async getOpenTradePreview(
    wallet: string,
    orderData: CreateOrder[],
    existingPos: (PositionInfo | undefined)[],
    opts?: ApiOpts
  ): Promise<OpenTradePreviewInfo[]> {
    const promises: Promise<OpenTradePreviewInfo[] | undefined>[] = []
    orderData.forEach((order, index) => {
      const adapter = this._checkAndGetAdapter(order.marketId)
      promises.push(errorCatcher(() => adapter.getOpenTradePreview(wallet, [order], [existingPos[index]], opts)))
    })
    const out = (await Promise.all(promises)).filter((v) => !!v) as OpenTradePreviewInfo[][]
    return out.flat()
  }
  async getCloseTradePreview(
    wallet: string,
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[],
    opts?: ApiOpts
  ): Promise<CloseTradePreviewInfo[]> {
    const promises: Promise<CloseTradePreviewInfo[] | undefined>[] = []
    positionInfo.forEach((position, index) => {
      const adapter = this._checkAndGetAdapter(position.marketId)
      promises.push(
        errorCatcher(() => adapter.getCloseTradePreview(wallet, [position], [closePositionData[index]], opts))
      )
    })
    const out = (await Promise.all(promises)).filter((v) => !!v) as CloseTradePreviewInfo[][]
    return out.flat()
  }
  async getUpdateMarginPreview(
    wallet: string,
    isDeposit: boolean[],
    marginDelta: AmountInfo[],
    existingPos: PositionInfo[],
    opts?: ApiOpts
  ): Promise<PreviewInfo[]> {
    const promises: Promise<PreviewInfo[] | undefined>[] = []

    existingPos.forEach((position, index) => {
      const adapter = this._checkAndGetAdapter(position.marketId)
      promises.push(
        errorCatcher(() =>
          adapter.getUpdateMarginPreview(wallet, [isDeposit[index]], [marginDelta[index]], [existingPos[index]], opts)
        )
      )
    })

    const out = (await Promise.all(promises)).filter((v) => !!v) as PreviewInfo[][]
    return out.flat()
  }
  async getTotalClaimableFunding(wallet: string, opts?: ApiOpts): Promise<FixedNumber> {
    const fundingPromises: Promise<FixedNumber | undefined>[] = []
    for (const key in this.adapters) {
      fundingPromises.push(errorCatcher(() => this.adapters[key].getTotalClaimableFunding(wallet, opts)))
    }
    const out = (await Promise.all(fundingPromises)).filter((v) => !!v) as FixedNumber[]
    return out.reduce((acc, curr) => acc.add(curr), FixedNumber.fromValue(0, 30, 30))
  }

  async getTotalAccuredFunding(wallet: string, opts?: ApiOpts): Promise<FixedNumber> {
    const fundingPromises: Promise<FixedNumber | undefined>[] = []
    for (const key in this.adapters) {
      fundingPromises.push(errorCatcher(() => this.adapters[key].getTotalAccuredFunding(wallet, opts)))
    }
    const out = (await Promise.all(fundingPromises)).filter((v) => !!v) as FixedNumber[]
    return out.reduce((acc, curr) => acc.add(curr), FixedNumber.fromValue(0, 30, 30))
  }

  async getAccountInfo(wallet: string, opts?: ApiOpts): Promise<AccountInfo[]> {
    const promises: Promise<AccountInfo | undefined>[] = []
    for (const key in this.adapters) {
      promises.push(errorCatcher(() => this.adapters[key].getAccountInfo(wallet, opts).then((res) => res[0])))
    }
    const out = (await Promise.all(promises)).filter((v) => !!v) as AccountInfo[]

    return out.filter((v) => v != undefined).flat()
  }

  async getOrderBooks(
    marketIds: string[],
    sigFigs: (number | undefined)[],
    opts?: ApiOpts | undefined
  ): Promise<OrderBook[]> {
    const obPromises: Promise<OrderBook[] | undefined>[] = []
    for (let i = 0; i < marketIds.length; i++) {
      const adapter = this._checkAndGetAdapter(marketIds[i])
      obPromises.push(errorCatcher(() => adapter.getOrderBooks([marketIds[i]], [sigFigs[i]], opts)))
    }

    const out = (await Promise.all(obPromises)).filter((v) => !!v) as OrderBook[][]
    return out.flat()
  }

  async getTokenPrice(token: string, decimals: number): Promise<BigNumber | null> {
    const tokenPrice = getTokenPriceD(token, decimals)

    return tokenPrice
  }

  async get24hOldPrice(
    indexSymbol: string,
    marketsV1: MarketInfo[]
  ): Promise<
    { source: 'pyth' | 'hl' | 'aevo' | 'dydx' | 'hltest' | 'synfutures'; bars: TVBar[]; oldPrice: number } | undefined
  > {
    type DataFeedArgs = {
      source: 'pyth' | 'hl' | 'aevo' | 'dydx' | 'hltest' | 'synfutures'
      marketsV1: MarketInfo[] | undefined
    }

    let source: DataFeedArgs['source'] | undefined

    function matchMarket(markets: MarketInfo[] | undefined, protocolId: ProtocolId, indexSymbolIn: string) {
      if (!markets) return false

      return markets?.filter((m) => m.protocolId === protocolId).some((m) => m?.marketSymbol === indexSymbolIn)
    }

    if (matchMarket(marketsV1, 'DYDXV4', indexSymbol)) {
      source = 'dydx'
    }
    if (matchMarket(marketsV1, 'AEVO', indexSymbol)) {
      source = 'aevo'
    }
    if (matchMarket(marketsV1, 'HL', indexSymbol)) {
      source = 'hl'
    }
    if (matchMarket(marketsV1, 'SYNFUTURES', indexSymbol)) {
      source = 'synfutures'
    }

    if (!source) {
      source = 'pyth' // assign anyways
    }

    const now = Math.floor(Date.now() / 1000)
    const fiveMinutesAgo = now - 5 * 60
    const oneDayAgo = now - 24 * 60 * 60

    const params: GetBarsParams = {
      symbolInfo: indexSymbol + '-USD',
      resolution: source === 'aevo' ? '60' : '1',
      from: source === 'aevo' ? oneDayAgo : fiveMinutesAgo,
      to: now,
      countBack: 5,
      firstDataRequest: true
    }

    let bars: TVBar[] = []

    try {
      // latest bar is first
      bars = (await this.getBars(source, params)).toSorted((a, b) => b.time - a.time)
      return { source, bars, oldPrice: bars[0]?.close }
    } catch (e) {
      console.error('get24hOldPrice error', e, params)
    }
  }

  async getBars(
    source: 'pyth' | 'hl' | 'aevo' | 'dydx' | 'hltest' | 'synfutures',
    params: GetBarsParams
  ): Promise<TVBar[]> {
    let bars: TVBar[] = []

    if (source === 'pyth') {
      bars = await getPythBars(params)
    } else if (source === 'aevo') {
      bars = await this.adapters[protocols.AEVO.symbol].getBars(params)
    } else if (source === 'hl') {
      bars = await this.adapters[protocols.HYPERLIQUID.symbol].getBars(params)
    } else if (source === 'dydx') {
      bars = await this.adapters[protocols.DYDXV4.symbol].getBars(params)
    } else if (source === 'synfutures') {
      bars = await this.adapters[protocols.SYNFUTURES.symbol].getBars(params)
    } else {
      throw new Error(`Unknown source: ${source}`)
    }

    return bars
  }

  subscribeStream(
    source: 'pyth' | 'hl' | 'aevo' | 'dydx' | 'hltest' | 'synfutures',
    params: SubscribeCandleArgs
  ): void {
    const { symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback, lastBarsCache } =
      params

    switch (source) {
      case 'pyth':
        return subscribeOnStream(
          symbolInfo as { ticker: string },
          resolution,
          onRealtimeCallback,
          subscriberUID,
          onResetCacheNeededCallback,
          lastBarsCache.get(symbolInfo.ticker!)!
        )
      case 'hl':
        return subscribeHLCandles(params)
      case 'aevo':
        return subscribeAevoCandles(params)
      case 'synfutures':
        return
      //  return subscribeHLCandles(params)
      default:
        throw new Error('Unknown source')
    }
  }

  unsubscribeStream(
    source: 'pyth' | 'hl' | 'aevo' | 'dydx' | 'hltest' | 'synfutures',
    subscriberUID: SubscribeCandleArgs['subscriberUID']
  ): void {
    switch (source) {
      case 'pyth':
        return unsubscribeFromStream(subscriberUID)
      case 'hl':
        return unSubscribeHLCandles(subscriberUID)
      case 'aevo':
        return unSubscribeAevoCandles(subscriberUID)
      case 'synfutures':
        return
      default:
        throw new Error('Unknown source')
    }
  }

  isOrderForPosition(order: OrderInfo, position: PositionInfo): boolean {
    const adapter = this._checkAndGetAdapter(position.marketId)
    return adapter.isOrderForPosition(order, position)
  }

  getDepositWithdrawTime(
    protocolId: ProtocolId,
    action: 'Deposit' | 'Withdraw',
    isEthChain: boolean,
    isArbitrumChain: boolean,
    isOptimismChain: boolean
  ): { deposit: string; withdraw: string } {
    return this.adapters[protocolId].getDepositWithdrawTime(action, isEthChain, isArbitrumChain, isOptimismChain)
  }

  getMatchingPosition(
    protocolId: ProtocolId,
    positions: PositionInfo[],
    market: MarketInfo,
    collateralToken: Token,
    order: 'long' | 'short'
  ): PositionInfo | undefined {
    return this.adapters[protocolId].getMatchingPosition(positions, market, collateralToken, order)
  }

  async getWithdrawableBalance(
    protocolId: ProtocolId,
    wallet: string,
    collateralToken: Token,
    market: MarketInfo,
    opts?: ApiOpts
  ): Promise<FixedNumber> {
    return this.adapters[protocolId].getWithdrawableBalance(wallet, collateralToken, market, opts)
  }
}
