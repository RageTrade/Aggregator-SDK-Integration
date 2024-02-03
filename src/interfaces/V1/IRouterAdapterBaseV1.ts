import { Chain } from 'viem'
import { Token } from '../../common/tokens'
import { ActionParam } from '../IActionExecutor'
import { FixedNumber } from '../../common/fixedNumber'

export type ApiOpts = {
  bypassCache: boolean // bypass query client cache altogether
  overrideStaleTime?: number // pass the stale time to override default stale time
}

export type AmountInfo = {
  amount: FixedNumber
  isTokenAmount: boolean
}

export type CreateOrderType = 'LIMIT' | 'MARKET' // IncreasePosition

export type CloseOrderType = 'STOP_LOSS' | 'TAKE_PROFIT' | 'MARKET' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT_LIMIT'

export type OrderType = CreateOrderType | CloseOrderType

export type OrderAction = 'CREATE' | 'UPDATE' | 'CANCEL'

export type ProtocolId = 'GMXV1' | 'SYNTHETIX_V2' | 'GMXV2' | 'HL'

export type TradeOperationType =
  | 'Open Long'
  | 'Close Long'
  | 'Open Short'
  | 'Close Short'
  | 'Long'
  | 'Short'
  | 'Long > Short'
  | 'Short > Long'

export type ClaimType = 'Funding'

export type MarketMode = 'ISOLATED' | 'CROSS'

export type TimeInForce = 'GTC' | 'IOC' | 'ALO'

export type Protocol = {
  protocolId: ProtocolId
}

export type AvailableToTradeParams<T extends ProtocolId> = T extends 'GMXV1' | 'GMXV2'
  ? undefined
  : T extends 'SYNTHETIX_V2'
  ? { market: Market['marketId'] }
  : T extends 'HL'
  ? {
      market: Market['marketId']
      direction: TradeDirection
      mode: MarketMode
      sizeDelta: AmountInfo
      marginDelta: AmountInfo
    }
  : never

export type DepositWithdrawParams = {
  amount: FixedNumber
  wallet: string
  protocol: ProtocolId
  market?: Market['marketId']
}

export type AgentParams = {
  // if address is same as currrently set address, it throws
  // if address is zero address, it revokes
  // if address is anything different from current set address, it revokes and sets to new one
  agentAddress: string
} & Protocol

export type AgentState = {
  agentAddress: string
  isAuthenticated: boolean
} & Protocol

export type Market = {
  marketId: string // Global unique identifier for the market (ChainId:protocolId:protocolMarketId)
  chain: Chain
  indexToken: Token
  longCollateral: Token[]
  shortCollateral: Token[]
  supportedModes: Record<MarketMode, Boolean>
  supportedOrderTypes: Record<OrderType, Boolean>
  supportedOrderActions: Record<OrderAction, Boolean>
  marketSymbol: string
  metadata?: any
}

export type GenericStaticMarketMetadata = {
  maxLeverage: FixedNumber
  minLeverage: FixedNumber
  minInitialMargin: FixedNumber
  minPositionSize: FixedNumber
  maxPrecision: number // used for OrderBook exchanges, for non orderbook exchanges, this is defaulted to 1
}

export type SynV2StaticMarketMetadata = GenericStaticMarketMetadata & {
  address: string
  asset: string // check if can be removed
}

export type StaticMarketMetadata =
  | {
      protocolId: 'GMXV1'
      data: GenericStaticMarketMetadata
    }
  | {
      protocolId: 'SYNTHETIX_V2'
      data: SynV2StaticMarketMetadata
    }

export type DynamicMarketMetadata = {
  oiLong: FixedNumber
  oiShort: FixedNumber
  availableLiquidityLong: FixedNumber
  availableLiquidityShort: FixedNumber
  longFundingRate: FixedNumber
  shortFundingRate: FixedNumber
  longBorrowRate: FixedNumber
  shortBorrowRate: FixedNumber
}

export type MarketInfo = Market & GenericStaticMarketMetadata & Protocol

export type TradeDirection = 'LONG' | 'SHORT'

export type TriggerData = {
  // market price for market orders, limit price for limit orders, price at which order is placed in books for SL/TP/TPL/SPL
  triggerPrice: FixedNumber
  triggerAboveThreshold: boolean
  // limit price for TPL/SPL orders, undefined otherwise
  triggerLimitPrice: FixedNumber | undefined
}

export type TradeData = {
  marketId: Market['marketId']
  direction: TradeDirection
  sizeDelta: AmountInfo
  marginDelta: AmountInfo
}

export type OrderData = TradeData & {
  triggerData: TriggerData | undefined
  mode: 'ISOLATED' | 'CROSS'
}

export type CollateralData = {
  collateral: Token
}

export type OrderIdentifier = {
  marketId: Market['marketId']
  orderId: string
}

export type CreateOrder = OrderData &
  CollateralData & {
    type: CreateOrderType
    tif?: TimeInForce
    slippage: number | undefined
  }

export type UpdateOrder = OrderData &
  OrderIdentifier & {
    tif?: TimeInForce
    orderType: OrderType
  }

export type OrderInfo = OrderData &
  OrderIdentifier &
  CollateralData & {
    orderType: OrderType
    tif: TimeInForce | undefined
    protocolId: ProtocolId
  }

// for SNX v2, orderIdentifier is same as marketIdentifier
export type CancelOrder = OrderIdentifier & {
  type: OrderType
}

export type PositionData = {
  marketId: Market['marketId']
  posId: string
  size: AmountInfo
  margin: AmountInfo
  accessibleMargin: AmountInfo
  avgEntryPrice: FixedNumber
  cumulativeFunding: FixedNumber
  unrealizedPnl: FixedNumber
  liquidationPrice: FixedNumber
  leverage: FixedNumber
  direction: TradeDirection
  collateral: Token
  indexToken: Token
  mode: MarketMode
}

export type PositionInfo = PositionData & {
  protocolId: ProtocolId
} & {
  roe: FixedNumber
  metadata: any
}

export type HistoricalTradeInfo = TradeData &
  CollateralData & {
    timestamp: number
    indexPrice: FixedNumber
    collateralPrice: FixedNumber
    realizedPnl: FixedNumber
    keeperFeesPaid: FixedNumber
    positionFee: FixedNumber
    operationType: TradeOperationType
    txHash: string
  }

export type LiquidationInfo = CollateralData & {
  marketId: Market['marketId']
  liquidationPrice: FixedNumber
  direction: TradeDirection
  sizeClosed: AmountInfo
  realizedPnl: FixedNumber
  liquidationFees: FixedNumber
  remainingCollateral: AmountInfo
  liqudationLeverage: FixedNumber
  timestamp: number
  txHash: string | undefined // currently undefined for snx
}

export type ClaimInfo = {
  marketId: Market['marketId']
  timestamp: number
  token: Token
  amount: AmountInfo
  claimType: ClaimType
  txHash: string
}

export type ClosePositionData = {
  closeSize: AmountInfo
  type: CloseOrderType
  tif?: TimeInForce
  triggerData: TriggerData | undefined
  outputCollateral: Token | undefined
}

export type UpdatePositionMarginData = CollateralData & {
  margin: AmountInfo
  isDeposit: boolean
}

export type ErrorData = {
  isError: boolean
  errMsg: string
}

export type PreviewInfo = CollateralData & {
  marketId: Market['marketId']
  leverage: FixedNumber
  size: AmountInfo
  margin: AmountInfo
  avgEntryPrice: FixedNumber
  liqudationPrice: FixedNumber
  fee: FixedNumber
} & ErrorData

export type OpenTradePreviewInfo = PreviewInfo & {
  priceImpact: FixedNumber
}

export type CloseTradePreviewInfo = PreviewInfo & {
  receiveMargin: AmountInfo
}

export type IdleMarginInfo = CollateralData & {
  marketId: Market['marketId']
  amount: FixedNumber // Always token terms
}

export type PageOptions = {
  limit: number
  skip: number
}

export type PaginatedRes<T> = {
  result: T[]
  maxItemsCount: number
}

export type RouterAdapterMethod = keyof IRouterAdapterBaseV1

export type AccountInfo = {
  protocolId: ProtocolId
  accountEquity: FixedNumber
  totalMarginUsed: FixedNumber
  maintainenceMargin: FixedNumber
  withdrawable: FixedNumber
  availableToTrade: FixedNumber
  crossAccountLeverage: FixedNumber
}

export type MarketState = {
  leverage: FixedNumber
  marketMode: MarketMode
}

export type OBLevel = {
  price: FixedNumber
  sizeToken: FixedNumber
  sizeUsd: FixedNumber
  totalSizeToken: FixedNumber
  totalSizeUsd: FixedNumber
}

export type OBData = {
  actualPrecision: FixedNumber
  bids: OBLevel[] // sorted from highest to lowest price (logically descending from mid point of OrderBook)
  asks: OBLevel[] // sorted from lowest to highest price (logically ascending from mid point of OrderBook)
  spread: FixedNumber
  spreadPercent: FixedNumber
}

export type OrderBook = {
  marketId: Market['marketId']
  precisionOBData: Record<number, OBData>
  actualPrecisionsMap: Record<number, FixedNumber>
}

export interface IRouterAdapterBaseV1 {
  ///// Init Api //////
  init(wallet: string | undefined, opts?: ApiOpts): Promise<void>

  ///// Setup api //////
  setup(): Promise<ActionParam[]>

  deposit(params: DepositWithdrawParams[]): Promise<ActionParam[]>

  withdraw(params: DepositWithdrawParams[]): Promise<ActionParam[]>

  ///// Network api //////
  supportedChains(opts?: ApiOpts): Chain[]

  ///// Market api's //////
  supportedMarkets(chains: Chain[] | undefined, opts?: ApiOpts): Promise<MarketInfo[]>

  getMarketPrices(marketIds: Market['marketId'][], opts?: ApiOpts): Promise<FixedNumber[]>

  getMarketsInfo(marketIds: Market['marketId'][], opts?: ApiOpts): Promise<MarketInfo[]>

  getDynamicMarketMetadata(marketIds: Market['marketId'][], opts?: ApiOpts): Promise<DynamicMarketMetadata[]>

  ///// Action api's //////

  increasePosition(orderData: CreateOrder[], wallet: string, opts?: ApiOpts): Promise<ActionParam[]>

  updateOrder(orderData: UpdateOrder[], wallet: string, opts?: ApiOpts): Promise<ActionParam[]>

  cancelOrder(orderData: CancelOrder[], wallet: string, opts?: ApiOpts): Promise<ActionParam[]>

  authenticateAgent(agentParams: AgentParams[], wallet: string, opts?: ApiOpts): Promise<ActionParam[]>

  closePosition(
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[],
    wallet: string,
    opts?: ApiOpts
  ): Promise<ActionParam[]>

  updatePositionMargin(
    positionInfo: PositionInfo[],
    updatePositionMarginData: UpdatePositionMarginData[],
    wallet: string,
    opts?: ApiOpts
  ): Promise<ActionParam[]>

  claimFunding(wallet: string, opts?: ApiOpts): Promise<ActionParam[]>

  ///// Fetching api's //////
  getIdleMargins(wallet: string, opts?: ApiOpts): Promise<Array<IdleMarginInfo>>

  getAllPositions(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts
  ): Promise<PaginatedRes<PositionInfo>>

  getAllOrders(wallet: string, pageOptions: PageOptions | undefined, opts?: ApiOpts): Promise<PaginatedRes<OrderInfo>>

  getAllOrdersForPosition(
    wallet: string,
    positionInfo: PositionInfo[],
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts
  ): Promise<Record<PositionData['posId'], PaginatedRes<OrderInfo>>>

  getTradesHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts
  ): Promise<PaginatedRes<HistoricalTradeInfo>>

  getLiquidationHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts
  ): Promise<PaginatedRes<LiquidationInfo>>

  getClaimHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts
  ): Promise<PaginatedRes<ClaimInfo>>

  getOpenTradePreview(
    wallet: string,
    orderData: CreateOrder[],
    existingPos: Array<PositionInfo | undefined>,
    opts?: ApiOpts
  ): Promise<OpenTradePreviewInfo[]>

  getCloseTradePreview(
    wallet: string,
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[],
    opts?: ApiOpts
  ): Promise<CloseTradePreviewInfo[]>

  getUpdateMarginPreview(
    wallet: string,
    isDeposit: boolean[],
    marginDelta: AmountInfo[],
    existingPos: Array<PositionInfo>,
    opts?: ApiOpts
  ): Promise<PreviewInfo[]>

  getTotalClaimableFunding(wallet: string, opts?: ApiOpts): Promise<FixedNumber>

  getTotalAccuredFunding(wallet: string, opts?: ApiOpts): Promise<FixedNumber>

  getAccountInfo(wallet: string, opts?: ApiOpts): Promise<AccountInfo[]>

  getMarketState(wallet: string, marketIds: Market['marketId'][], opts?: ApiOpts): Promise<MarketState[]>

  getAgentState(wallet: string, agentParams: AgentParams[], opts?: ApiOpts): Promise<AgentState[]>

  // precision can be undefined, in which case orderbooks for all precisions will be returned
  // precision starts with 1 and goes upto maxPrecision (returned in supportedMarkets()) with 1 being the least precise
  getOrderBooks(
    marketIds: Market['marketId'][],
    precision: (number | undefined)[],
    opts?: ApiOpts
  ): Promise<OrderBook[]>
}
