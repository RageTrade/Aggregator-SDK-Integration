import { Chain } from 'viem'
import {
  Protocol,
  MarketInfo,
  DynamicMarketMetadata,
  CreateOrder,
  UpdateOrder,
  CancelOrder,
  PositionInfo,
  ClosePositionData,
  UpdatePositionMarginData,
  CollateralData,
  AmountInfo,
  PageOptions,
  PaginatedRes,
  OrderInfo,
  HistoricalTradeInfo,
  LiquidationInfo,
  OpenTradePreviewInfo,
  CloseTradePreviewInfo,
  PreviewInfo,
  ProtocolId,
  Market,
  PositionData,
  ClaimInfo,
  ApiOpts,
  AccountInfo,
  MarketState,
  OrderBook,
  AvailableToTradeParams,
  DepositWithdrawParams,
  AgentParams,
  AgentState,
  IdleMarginInfo
} from '../src/interfaces/V1/IRouterAdapterBaseV1'
import { IRouterV1 } from '../src/interfaces/V1/IRouterV1'
import { protocols } from '../src/common/protocols'
import { arbitrum, optimism } from 'viem/chains'
import GMXV2Service from '../src/exchanges/gmxv2'
import { getPaginatedResponse } from '../src/common/helper'
import { decodeMarketId } from '../src/common/markets'
import { FixedNumber } from '../src/common/fixedNumber'
import { ActionParam } from '../src/interfaces/IActionExecutor'
import HyperliquidAdapterV1 from '../src/exchanges/hyperliquid'
import { IAdapterV1, ProtocolInfo } from '../src/interfaces/V1/IAdapterV1'
import AevoAdapterV1 from '../src/exchanges/aevo'
import { errorCatcher } from '../src/common/errors'

export default class RouterV1 implements IRouterV1 {
  adapters: Record<string, IAdapterV1> = {}

  _checkAndGetAdapter(marketId: Market['marketId']) {
    const { protocolId } = decodeMarketId(marketId)
    const adapter = this.adapters[protocolId]
    if (!adapter) throw new Error(`Protocol ${protocolId} not supported`)
    return adapter
  }

  constructor() {
    this.adapters[protocols.GMXV2.symbol] = new GMXV2Service()
    this.adapters[protocols.HYPERLIQUID.symbol] = new HyperliquidAdapterV1()
    this.adapters[protocols.AEVO.symbol] = new AevoAdapterV1()
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

  async setup(): Promise<ActionParam[]> {
    const setupPromises: Promise<ActionParam[] | undefined>[] = []
    for (const key in this.adapters) {
      setupPromises.push(errorCatcher(() => this.adapters[key].setup()))
    }
    const out = (await Promise.all(setupPromises)).filter((v) => !!v) as ActionParam[][]

    return out.flat()
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
}
