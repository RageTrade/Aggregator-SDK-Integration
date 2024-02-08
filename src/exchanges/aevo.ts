import { Chain } from 'viem'
import { FixedNumber } from '../common/fixedNumber'
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
  OrderBook
} from '../interfaces/V1/IRouterAdapterBaseV1'
import { arbitrum } from 'viem/dist/types/chains'
import { hyperliquid } from '../configs/hyperliquid/api/config'
import { AevoClient } from '../../generated/aevo'
import { AEVO_CACHE_PREFIX, CACHE_DAY, CACHE_TIME_MULT, cacheFetch, getStaleTime } from '../common/cache'

class ExtendedAevoClient extends AevoClient {
  public static setCredentials(apiKey: string, apiSecret: string) {}
}

export default class AevoAdapterV1 implements IAdapterV1 {
  protocolId: ProtocolId = 'AEVO'

  private aevoClient = new ExtendedAevoClient()

  private publicApi = this.aevoClient.publicApi
  private privateApi = this.aevoClient.privateApi

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
  init(wallet: string | undefined, opts?: ApiOpts | undefined): Promise<void> {
    throw new Error('Method not implemented.')
  }
  setup(): Promise<ActionParam[]> {
    return Promise.resolve([])
  }

  deposit(params: DepositWithdrawParams[]): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }

  withdraw(params: DepositWithdrawParams[]): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }

  supportedChains(opts?: ApiOpts | undefined): Chain[] {
    return [arbitrum]
  }

  async supportedMarkets(chains: Chain[] | undefined, opts?: ApiOpts | undefined): Promise<MarketInfo[]> {
    let marketInfo: MarketInfo[] = []

    if (chains == undefined || chains.includes(hyperliquid)) {
      const allMarkets = (await this._getAllMarkets(opts)).filter((m) => m.is_active)

      allMarkets.forEach((m) => {})
    }

    return marketInfo
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

  /// Internal helper functions ///
  async _getAllMarkets(opts?: ApiOpts) {
    const sTimeMarkets = getStaleTime(CACHE_DAY, opts)
    return await cacheFetch({
      key: [AEVO_CACHE_PREFIX, 'allmarkets'],
      fn: () => this.publicApi.getMarkets(undefined, 'PERPETUAL'),
      staleTime: sTimeMarkets,
      cacheTime: sTimeMarkets * CACHE_TIME_MULT,
      opts
    })
  }
}
