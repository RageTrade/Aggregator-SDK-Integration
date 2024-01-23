import { BigNumber, UnsignedTransaction, Wallet } from 'ethers'
import { AddressValidationAdditionalSessionData, ERC20ApprovalAddtionalSessionData } from '../../tx-metadata-types'
import { Token } from '../../common/tokens'
import { Chain } from 'viem'
import { FixedNumber } from '../../common/fixedNumber'
import { ActionParam } from '../IActionExecutor'

export type ApiOpts = {
  bypassCache: boolean // bypass query client cache altogether
  overrideStaleTime?: number // pass the stale time to override default stale time
}

export type AmountInfo = {
  amount: FixedNumber
  isTokenAmount: boolean
}

export type CreateOrderType = 'LIMIT' | 'MARKET' // IncreasePosition

export type CloseOrderType =
  | 'STOP_LOSS'
  | 'TAKE_PROFIT'
  | 'MARKET'
  | 'STOP_LOSS_LIMIT'
  | 'TAKE_PROFIT_LIMIT'
  | 'REDUCE_LIMIT' // ClosePosition

export type OrderType = CreateOrderType | CloseOrderType

export type OrderAction = 'CREATE' | 'UPDATE' | 'CANCEL'

export type ProtocolId = 'GMXV1' | 'SYNTHETIX_V2' | 'PERV2' | 'GMXV2' | 'HL'

export type TradeOperationType = 'Open Long' | 'Close Long' | 'Open Short' | 'Close Short' | 'Long' | 'Short'

export type ClaimType = 'Funding'

export type MarketMode = 'ISOLATED' | 'CROSS'

export type Protocol = {
  protocolId: ProtocolId
}

export type AmountInfoInToken = {
  sizeDeltaInToken: boolean
  collateralDeltaInToken: boolean
}

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
  | {
    protocolId: 'PERV2'
    data: GenericStaticMarketMetadata
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
  triggerPrice: FixedNumber
  triggerAboveThreshold: boolean
  triggerActivatePrice: FixedNumber | undefined
}

export type TradeData = {
  marketId: Market['marketId']
  direction: TradeDirection
  sizeDelta: AmountInfo
  marginDelta: AmountInfo
}

export type OrderData = TradeData & {
  triggerData: TriggerData | undefined
  mode?: 'ISOLATED' | 'CROSS'
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
    slippage: number | undefined
  }

export type UpdateOrder = OrderData &
  OrderIdentifier & {
    orderType: OrderType
  }

export type OrderInfo = OrderData &
  OrderIdentifier & { orderType: OrderType } & CollateralData & {
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

export type MarketState = {
  leverage: FixedNumber
  marketMode: MarketMode
}

export interface IRouterAdapterBaseV1 {
  ///// Init Api //////
  init(wallet: string | undefined, opts?: ApiOpts): Promise<void>

  ///// Setup api //////
  setup(): Promise<ActionParam[]>

  deposit(token: Token, amount: FixedNumber): Promise<ActionParam[]>

  withdraw(token: Token, amount: FixedNumber, wallet: string): Promise<ActionParam[]>

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

  getMarketState(wallet: string, marketIds: Market['marketId'][], opts?: ApiOpts): Promise<MarketState[]>

  //Helper
  getAmountInfoType(): AmountInfoInToken
}
