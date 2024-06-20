import { Chain } from 'viem'
import { SupportedChains, Token } from '../../common/tokens'
import { ActionParam } from '../IActionExecutor'
import { FixedNumber } from '../../common/fixedNumber'
import { AevoClient } from '../../../generated/aevo'
/**
 * Represents the authentication information required for AEVO protocol.
 * @property apiKey The API key for authentication.
 * @property secret The secret key for authentication.
 */
export type AevoAuth = {
  apiKey: string
  secret: string
}

/**
 * Represents the options for API requests.
 * @property bypassCache Indicates whether to bypass query client cache and refetch the data.
 * @property overrideStaleTime Specifies the stale time to override default stale time.
 * @property aevoAuth Optional AEVO authentication information.
 */
export type ApiOpts = {
  bypassCache: boolean
  overrideStaleTime?: number
  aevoAuth?: AevoAuth
  orderlyAuth?: OrderlyAuth
}

/**
 * Represents the options for Orderly setup.
 * @property keyExpirationInDays amount in days when Orderly key will expire. Default = 365
 */
export type OrderlyAuth = {
  keyExpirationInDays?: number
}

/**
 * Used to represent token / usd amount.
 * @property amount The amount. If the amount is usd terms it has 30 decimals else it has token decimals
 * @property isTokenAmount Indicates if the amount is in token terms.
 */
export type AmountInfo = {
  amount: FixedNumber
  isTokenAmount: boolean
}

/**
 * Represents the type of order to create.
 */
export type CreateOrderType = 'LIMIT' | 'MARKET'

/**
 * Represents the type of order closure.
 */
export type CloseOrderType = 'STOP_LOSS' | 'TAKE_PROFIT' | 'MARKET' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT_LIMIT'

/**
 * Represents the type of order. Union of create and close order types
 */
export type OrderType = CreateOrderType | CloseOrderType

/**
 * Represents the action type for an order.
 */
export type OrderAction = 'CREATE' | 'UPDATE' | 'CANCEL'

/**
 * Represents the protocol ID.
 */
export type ProtocolId = 'GMXV1' | 'SYNTHETIX_V2' | 'GMXV2' | 'HL' | 'AEVO' | 'ORDERLY'

/**
 * Represents the type of trade operation.
 */
export type TradeOperationType =
  | 'Open Long'
  | 'Close Long'
  | 'Open Short'
  | 'Close Short'
  | 'Long'
  | 'Short'
  | 'Long > Short'
  | 'Short > Long'

/**
 * Represents the type of claim.
 */
export type ClaimType = 'Funding'

/**
 * Represents the mode of the market.
 */
export type MarketMode = 'ISOLATED' | 'CROSS'

/**
 * Represents the time in force for an order.
 * GTC - Good Till Cancelled
 * IOC - Immidiate or cancel
 * ALO - Allocate Liquidity Only
 */
export type TimeInForce = 'GTC' | 'IOC' | 'ALO'

/**
 * Represents a protocol.
 * @property protocolId The ID of the protocol.
 */
export type Protocol = {
  protocolId: ProtocolId
}

/**
 * Represents the parameters to retreive available for trading based on the protocol.
 */
export type AvailableToTradeParams<T extends ProtocolId> = T extends 'GMXV1' | 'GMXV2' | 'AEVO'
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

export type AuthParams<T extends ProtocolId> = T extends 'AEVO' ? AevoAuth : undefined
/**
 * Represents the parameters required for depositing or withdrawing assets.
 * @property amount The amount to deposit or withdraw.
 * @property wallet The wallet address.
 * @property protocol The ID of the protocol.
 * @property chainId The ID of the blockchain network.
 * @property token The token information.
 * @property market Optional market ID.
 */
export type DepositWithdrawParams = {
  amount: FixedNumber
  wallet: string
  protocol: ProtocolId
  chainId: SupportedChains
  token: Token
  market?: Market['marketId']
}

/**
 * Represents the parameters required for setting or revoking an agent.
 * @dev if address is same as currrently set address, it throws
 * @dev if address is zero address, it revokes
 * @dev if address is anything different from current set address, it revokes and sets to new one
 * @property agentAddress The address of the agent.
 * @property protocol Protocol information.
 */
export type AgentParams = {
  agentAddress: string
} & Protocol

/**
 * Represents the state of an agent.
 * @property agentAddress The address of the agent.
 * @property isAuthenticated Indicates whether the agent is authenticated.
 * @property protocol Protocol information.
 */
export type AgentState = {
  agentAddress: string
  isAuthenticated: boolean
} & Protocol

/**
 * Represents a market.
 * @property marketId The global unique identifier for the market (ChainId:protocolId:protocolMarketId)
 * @property chain The blockchain network.
 * @property indexToken The index token.
 * @property longCollateral Tokens for long collateral.
 * @property shortCollateral Tokens for short collateral.
 * @property supportedModes Supported market modes.
 * @property supportedOrderTypes Supported order types.
 * @property supportedOrderActions Supported order actions.
 * @property marketSymbol The symbol of the market.
 * @property metadata Additional metadata.
 */
export type Market = {
  marketId: string
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

/**
 * Represents generic static market metadata.
 * @property maxLeverage The maximum leverage.
 * @property minLeverage The minimum leverage.
 * @property minInitialMargin The minimum initial margin.
 * @property minPositionSize The minimum position size in usd
 * @property minPositionSizeToken The minimum position size in token
 * @property maxPrecision The maximum precision. Used for OrderBook exchanges, for non orderbook exchanges, this is defaulted to 1
 * @property amountStep The step for amount.
 * @property priceStep The step for price.
 */
export type GenericStaticMarketMetadata = {
  maxLeverage: FixedNumber
  minLeverage: FixedNumber
  minInitialMargin: FixedNumber
  minPositionSize: FixedNumber
  minPositionSizeToken: FixedNumber
  maxPrecision: number
  amountStep: FixedNumber | undefined
  priceStep: FixedNumber | undefined
}

/**
 * Represents Synthetix V2 static market metadata.
 * @property address The address.
 * @property asset The asset.
 */
export type SynV2StaticMarketMetadata = GenericStaticMarketMetadata & {
  address: string
  asset: string
}

/**
 * Represents static market metadata.
 */
export type StaticMarketMetadata =
  | {
      protocolId: 'GMXV1'
      data: GenericStaticMarketMetadata
    }
  | {
      protocolId: 'SYNTHETIX_V2'
      data: SynV2StaticMarketMetadata
    }

/**
 * Represents dynamic market metadata.
 * @property oiLong Open interest for long positions.
 * @property oiShort Open interest for short positions.
 * @property isOiBifurcated Indicates whether open interest is bifurcated across longs and shorts
 * @property availableLiquidityLong Available liquidity for long positions.
 * @property availableLiquidityShort Available liquidity for short positions.
 * @property longFundingRate Long funding rate.
 * @property shortFundingRate Short funding rate.
 * @property longBorrowRate Long borrow rate.
 * @property shortBorrowRate Short borrow rate.
 */
export type DynamicMarketMetadata = {
  oiLong: FixedNumber
  oiShort: FixedNumber
  isOiBifurcated: boolean
  availableLiquidityLong: FixedNumber
  availableLiquidityShort: FixedNumber
  longFundingRate: FixedNumber
  shortFundingRate: FixedNumber
  longBorrowRate: FixedNumber
  shortBorrowRate: FixedNumber
}

/**
 * Represents market information.
 */
export type MarketInfo = Market & GenericStaticMarketMetadata & Protocol

/**
 * Represents the direction of a trade.
 */
export type TradeDirection = 'LONG' | 'SHORT'

/**
 * Represents trigger data for an order.
 * @property triggerPrice The trigger price. Market price for market orders, limit price for limit orders, price at which order is placed in books for SL/TP/TPL/SPL
 * @property triggerAboveThreshold Indicates whether the trigger is above threshold.
 * @property triggerLimitPrice The limit price for TPL / SPL order. Undefined for other orders
 */
export type TriggerData = {
  triggerPrice: FixedNumber
  triggerAboveThreshold: boolean
  triggerLimitPrice: FixedNumber | undefined
}

/**
 * Represents trade data.
 * @property marketId The ID of the market.
 * @property direction The direction of the trade.
 * @property sizeDelta The size delta.
 * @property marginDelta The margin delta.
 */
export type TradeData = {
  marketId: Market['marketId']
  direction: TradeDirection
  sizeDelta: AmountInfo
  marginDelta: AmountInfo
}

/**
 * Represents order data.
 * @property triggerData Trigger data.
 * @property mode The mode of the order.
 */
export type OrderData = TradeData & {
  triggerData: TriggerData | undefined
  mode: 'ISOLATED' | 'CROSS'
}

/**
 * Represents collateral data.
 * @property collateral The collateral token.
 */
export type CollateralData = {
  collateral: Token
}

/**
 * Represents an order identifier.
 * @property marketId The ID of the market.
 * @property orderId The ID of the order.
 */
export type OrderIdentifier = {
  marketId: Market['marketId']
  orderId: string
}

/**
 * Represents data for creating an order.
 * @property type The type of order creation.
 * @property tif The time in force.
 * @property slippage The slippage.
 */
export type CreateOrder = OrderData &
  CollateralData & {
    type: CreateOrderType
    tif?: TimeInForce
    slippage: number | undefined
  }

/**
 * Represents data for updating an order.
 * @property tif The time in force.
 * @property orderType The type of order.
 */
export type UpdateOrder = OrderData &
  OrderIdentifier & {
    tif?: TimeInForce
    orderType: OrderType
  }

/**
 * Represents information about an order.
 * @property orderType The type of order.
 * @property tif The time in force.
 * @property protocolId The ID of the protocol.
 */
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

/**
 * Represents PNL data.
 * @property aggregatePnl The aggregate PNL.
 * @property rawPnl The raw PNL.
 * @property fundingFee The funding fee.
 * @property borrowFee The borrow fee.
 */
export type PnlData = {
  aggregatePnl: FixedNumber
  rawPnl: FixedNumber
  fundingFee: FixedNumber
  borrowFee: FixedNumber
}

/**
 * Represents position data.
 * @property marketId The ID of the market.
 * @property posId The ID of the position.
 * @property size The size of the position.
 * @property margin The margin of the position.
 * @property accessibleMargin The accessible margin of the position.
 * @property avgEntryPrice The average entry price of the position.
 * @property cumulativeFunding The cumulative funding of the position.
 * @property unrealizedPnl The unrealized PNL of the position.
 * @property liquidationPrice The liquidation price of the position.
 * @property leverage The leverage of the position.
 * @property direction The direction of the position.
 * @property collateral The collateral token of the position.
 * @property indexToken The index token of the position.
 * @property mode The mode of the market.
 */
export type PositionData = {
  marketId: Market['marketId']
  posId: string
  size: AmountInfo
  margin: AmountInfo
  accessibleMargin: AmountInfo
  avgEntryPrice: FixedNumber
  cumulativeFunding: FixedNumber
  unrealizedPnl: PnlData
  liquidationPrice: FixedNumber
  leverage: FixedNumber
  direction: TradeDirection
  collateral: Token
  indexToken: Token
  mode: MarketMode
}

/**
 * Represents information about a position.
 * @property protocolId The ID of the protocol.
 * @property roe The return on equity.
 * @property metadata Additional metadata.
 */
export type PositionInfo = PositionData & {
  protocolId: ProtocolId
} & {
  roe: FixedNumber
  metadata: any
}

/**
 * Represents historical trade information.
 * @property timestamp The timestamp of the trade.
 * @property indexPrice The index price of the trade.
 * @property collateralPrice The collateral price of the trade.
 * @property realizedPnl The realized PNL of the trade.
 * @property keeperFeesPaid The keeper fees paid in the trade.
 * @property positionFee The position fee of the trade.
 * @property operationType The operation type of the trade.
 * @property txHash The transaction hash of the trade.
 * @property id The ID of the trade.
 */
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
    id: string
  }

/**
 * Represents liquidation information.
 * @property liquidationPrice The liquidation price.
 * @property sizeClosed The closed size.
 * @property liqudationLeverage The liquidation leverage.
 * @property timestamp The timestamp.
 * @property txHash The transaction hash. Currently undefined for snx
 * @property id The ID of the liquidation.
 */
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
  txHash: string | undefined
  id: string
}

/**
 * Represents claim information.
 * @property timestamp The timestamp.
 * @property amount The amount.
 * @property claimType The claim type.
 * @property txHash The transaction hash.
 */
export type ClaimInfo = {
  marketId: Market['marketId']
  timestamp: number
  token: Token
  amount: AmountInfo
  claimType: ClaimType
  txHash: string
}

/**
 * Represents data for closing a position.
 * @property closeSize The size to close.
 * @property type The type of close order.
 * @property tif The time in force.
 * @property triggerData The trigger data.
 * @property outputCollateral The output collateral token.
 */
export type ClosePositionData = {
  closeSize: AmountInfo
  type: CloseOrderType
  tif?: TimeInForce
  triggerData: TriggerData | undefined
  outputCollateral: Token | undefined
}

/**
 * Represents data for updating position margin.
 * @property margin The margin to update.
 * @property isDeposit Indicates whether it's a deposit. True means deposit and false means withdraw
 */
export type UpdatePositionMarginData = CollateralData & {
  margin: AmountInfo
  isDeposit: boolean
}

/**
 * Represents error data.
 * @property isError Indicates whether it's an error.
 * @property errMsg The error message.
 */
export type ErrorData = {
  isError: boolean
  errMsg: string
}

/**
 * Represents preview information.
 * @property leverage The leverage.
 * @property size The size.
 * @property margin The margin.
 * @property avgEntryPrice The average entry price.
 * @property liqudationPrice The liquidation price.
 * @property fee The fee.
 */
export type PreviewInfo = CollateralData & {
  marketId: Market['marketId']
  leverage: FixedNumber
  size: AmountInfo
  margin: AmountInfo
  avgEntryPrice: FixedNumber
  liqudationPrice: FixedNumber
  fee: FixedNumber
} & ErrorData

/**
 * Represents preview information for opening a trade.
 * @property priceImpact The price impact.
 */
export type OpenTradePreviewInfo = PreviewInfo & {
  priceImpact: FixedNumber
}

/**
 * Represents preview information for closing a trade.
 * @property receiveMargin The received margin.
 */
export type CloseTradePreviewInfo = PreviewInfo & {
  receiveMargin: AmountInfo
}

/**
 * Represents idle margin information.
 * @property amount The amount in token
 */
export type IdleMarginInfo = CollateralData & {
  marketId: Market['marketId']
  amount: FixedNumber
}

/**
 * Represents page options.
 * @property limit The limit of items per page.
 * @property skip The number of items to skip.
 */
export type PageOptions = {
  limit: number
  skip: number
}

/**
 * Represents a paginated response.
 * @template T The type of result.
 * @property result The paginated result.
 * @property maxItemsCount The maximum number of items.
 */
export type PaginatedRes<T> = {
  result: T[]
  maxItemsCount: number
}

/**
 * Represents the method for the router adapter.
 */
export type RouterAdapterMethod = keyof IRouterAdapterBaseV1

/**
 * Represents the stored collateral data per protocol.
 */
type StoredCollateralData<T extends ProtocolId> = T extends 'GMXV1' | 'GMXV2' | 'SYNTHETIX_V2' | 'HL'
  ? undefined
  : T extends 'AEVO'
  ? Awaited<ReturnType<(typeof AevoClient)['prototype']['privateApi']['getAccount']>>['collaterals']
  : never

/**
 * Represents account information per protocol.
 * */
export type AccountInfoData<T extends ProtocolId> = T extends 'GMXV1' | 'GMXV2' | 'SYNTHETIX_V2'
  ? undefined
  : T extends 'HL'
  ? {
      accountEquity: FixedNumber // The equity of the account.
      totalMarginUsed: FixedNumber // The total margin used.
      maintainenceMargin: FixedNumber // The maintenance margin.
      withdrawable: FixedNumber // The withdrawable amount.
      availableToTrade: FixedNumber // The amount available for trading.
      crossAccountLeverage: FixedNumber // The cross account leverage.
    }
  : T extends 'AEVO'
  ? {
      imUtilizationPercent: FixedNumber // (initialMarginUsed + maintainenceMarginUsed) / equityBalance
      mmUtilizationPercent: FixedNumber // maintainenceMarginUsed / equityBalance
      initialMarginUsed: FixedNumber // The initial margin used.
      maintainenceMarginUsed: FixedNumber // The maintenance margin used.
      equityBalance: FixedNumber // The equity balance.
      availableBalance: FixedNumber // The available balance i.e. available to trade
      storedCollateral: StoredCollateralData<'AEVO'>
    }
  : never

/**
 * Represents account information.
 * @property protocolId The ID of the protocol.
 * @property accountInfoData Protocol specific account information.
 */
export type AccountInfo = {
  protocolId: ProtocolId
  accountInfoData: AccountInfoData<ProtocolId>
}

/**
 * Represents market state information.
 * @property leverage The leverage of the market.
 * @property marketMode The mode of the market.
 */
export type MarketState = {
  leverage: FixedNumber
  marketMode: MarketMode
}

/**
 * Represents an order book level.
 * @property price The price of the level.
 * @property sizeToken The size in token.
 * @property sizeUsd The size in USD.
 * @property totalSizeToken The total size in token.
 * @property totalSizeUsd The total size in USD.
 */
export type OBLevel = {
  price: FixedNumber
  sizeToken: FixedNumber
  sizeUsd: FixedNumber
  totalSizeToken: FixedNumber
  totalSizeUsd: FixedNumber
}

/**
 * Represents order book data.
 * @property actualPrecision The actual precision.
 * @property bids The bids. Sorted from highest to lowest price (logically descending from mid point of OrderBook)
 * @property asks The asks. Sorted from lowest to highest price (logically ascending from mid point of OrderBook)
 * @property spread The spread.
 * @property spreadPercent The spread percentage.
 */
export type OBData = {
  actualPrecision: FixedNumber
  bids: OBLevel[]
  asks: OBLevel[]
  spread: FixedNumber
  spreadPercent: FixedNumber
}

/**
 * Represents an order book.
 * @property marketId The ID of the market.
 * @property precisionOBData The precision order book data.
 * @property actualPrecisionsMap The actual precisions map.
 */
export type OrderBook = {
  marketId: Market['marketId']
  precisionOBData: Record<number, OBData>
  actualPrecisionsMap: Record<number, FixedNumber>
}

/**
 * Represents the base interface for router adapter v1.
 */
export interface IRouterAdapterBaseV1 {
  /**
   * Used to initialize cache for each adapter for faster loading on frontend
   * @param wallet The wallet address.
   * @param opts Additional options for the API initialization.
   * @returns A promise that resolves when the API is initialized.
   */
  init(wallet: string | undefined, opts?: ApiOpts): Promise<void>

  /**
   * Run the setup transactions (different for each route) - like plugin approvals / referral code setup etc.
   * @returns A promise that resolves to an array of action parameters for setup.
   */
  setup(): Promise<ActionParam[]>

  /**
   * Deposits assets into the protocol.
   * @param params An array of deposit parameters.
   * @returns A promise that resolves to an array of action parameters for the deposit transactions.
   */
  deposit(params: DepositWithdrawParams[]): Promise<ActionParam[]>

  /**
   * Withdraws assets from the protocol.
   * @param params An array of withdrawal parameters.
   * @returns A promise that resolves to an array of action parameters for the withdrawal transactions.
   */
  withdraw(params: DepositWithdrawParams[]): Promise<ActionParam[]>

  /**
   * Fetches supported blockchain networks.
   * @param opts Additional options for the API request.
   * @returns An array of supported blockchain networks.
   */
  supportedChains(opts?: ApiOpts): Chain[]

  /**
   * Fetches supported markets.
   * @param chains An array of blockchain networks to filter markets by.
   * @param opts Additional options for the API request.
   * @returns A promise that resolves to an array of market information.
   */
  supportedMarkets(chains: Chain[] | undefined, opts?: ApiOpts): Promise<MarketInfo[]>

  /**
   * Fetches market prices.
   * @param marketIds An array of market IDs.
   * @param opts Additional options for the API request.
   * @returns A promise that resolves to an array of market prices.
   */
  getMarketPrices(marketIds: Market['marketId'][], opts?: ApiOpts): Promise<FixedNumber[]>

  /**
   * Fetches information for multiple markets.
   * @param marketIds An array of market IDs.
   * @param opts Additional options for the API request.
   * @returns A promise that resolves to an array of market information.
   */
  getMarketsInfo(marketIds: Market['marketId'][], opts?: ApiOpts): Promise<MarketInfo[]>

  /**
   * Fetches dynamic market metadata for multiple markets.
   * @param marketIds An array of market IDs.
   * @param opts Additional options for the API request.
   * @returns A promise that resolves to an array of dynamic market metadata.
   */
  getDynamicMarketMetadata(marketIds: Market['marketId'][], opts?: ApiOpts): Promise<DynamicMarketMetadata[]>

  ///// Action api's //////
  /**
   * Increases the position with specified order data. Used to create market and limit orders
   * @dev adds a deposit transaction if the margin delta > available margin in the protocol
   * @param orderData Array of order data for increasing position.
   * @param wallet The wallet address.
   * @param opts Additional API options.
   * @returns Array of action parameters.
   */
  increasePosition(orderData: CreateOrder[], wallet: string, opts?: ApiOpts): Promise<ActionParam[]>

  /**
   * Updates the specified orders with new order data.
   * @param orderData Array of order data for updating orders.
   * @param wallet The wallet address.
   * @param opts Additional API options.
   * @returns Array of action parameters.
   */
  updateOrder(orderData: UpdateOrder[], wallet: string, opts?: ApiOpts): Promise<ActionParam[]>

  /**
   * Cancels the specified orders.
   * @param orderData Array of order identifiers for canceling orders.
   * @param wallet The wallet address.
   * @param opts Additional API options.
   * @returns Array of action parameters.
   */
  cancelOrder(orderData: CancelOrder[], wallet: string, opts?: ApiOpts): Promise<ActionParam[]>

  /**
   * Authenticates agents with specified parameters.
   * @param agentParams Array of agent parameters for authentication.
   * @param wallet The wallet address.
   * @param opts Additional API options.
   * @returns Array of action parameters.
   */
  authenticateAgent(agentParams: AgentParams[], wallet: string, opts?: ApiOpts): Promise<ActionParam[]>

  /**
   * Closes the specified positions with provided closing data.
   * @param positionInfo Array of position information to close.
   * @param closePositionData Array of data for closing positions.
   * @param wallet The wallet address.
   * @param opts Additional API options.
   * @returns Array of action parameters.
   */
  closePosition(
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[],
    wallet: string,
    opts?: ApiOpts
  ): Promise<ActionParam[]>

  /**
   * Updates the margin of specified positions.
   * @param positionInfo Array of position information to update margin.
   * @param updatePositionMarginData Array of data for updating position margin.
   * @param wallet The wallet address.
   * @param opts Additional API options.
   * @returns Array of action parameters.
   */
  updatePositionMargin(
    positionInfo: PositionInfo[],
    updatePositionMarginData: UpdatePositionMarginData[],
    wallet: string,
    opts?: ApiOpts
  ): Promise<ActionParam[]>

  /**
   * Claims funding for the specified wallet.
   * @param wallet The wallet address.
   * @param opts Additional API options.
   * @returns Array of action parameters.
   */
  claimFunding(wallet: string, opts?: ApiOpts): Promise<ActionParam[]>

  /**
   * Fetches idle margins for a specific wallet.
   * @param wallet The wallet address.
   * @param opts Additional options for the API request.
   * @returns A promise that resolves to an array of idle margin information.
   */
  getIdleMargins(wallet: string, opts?: ApiOpts): Promise<Array<IdleMarginInfo>>

  /**
   * Fetches all positions for a specific wallet.
   * @param wallet The wallet address.
   * @param pageOptions Options for pagination.
   * @param opts Additional options for the API request.
   * @returns A promise that resolves to a paginated response of position information.
   */
  getAllPositions(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts
  ): Promise<PaginatedRes<PositionInfo>>

  /**
   * Fetches all orders for a specific wallet.
   * @param wallet The wallet address.
   * @param pageOptions Options for pagination.
   * @param opts Additional options for the API request.
   * @returns A promise that resolves to a paginated response of order information.
   */
  getAllOrders(wallet: string, pageOptions: PageOptions | undefined, opts?: ApiOpts): Promise<PaginatedRes<OrderInfo>>

  /**
   * Fetches all orders for specific positions.
   * @param wallet The wallet address.
   * @param positionInfo Information about the positions.
   * @param pageOptions Options for pagination.
   * @param opts Additional options for the API request.
   * @returns A promise that resolves to a record of position IDs mapped to paginated responses of order information.
   */
  getAllOrdersForPosition(
    wallet: string,
    positionInfo: PositionInfo[],
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts
  ): Promise<Record<PositionData['posId'], PaginatedRes<OrderInfo>>>

  /**
   * Fetches trade history for a specific wallet.
   * @param wallet The wallet address.
   * @param pageOptions Options for pagination.
   * @param opts Additional options for the API request.
   * @returns A promise that resolves to a paginated response of historical trade information.
   */
  getTradesHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts
  ): Promise<PaginatedRes<HistoricalTradeInfo>>

  /**
   * Fetches liquidation history for a specific wallet.
   * @param wallet The wallet address.
   * @param pageOptions Options for pagination.
   * @param opts Additional options for the API request.
   * @returns A promise that resolves to a paginated response of liquidation information.
   */
  getLiquidationHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts
  ): Promise<PaginatedRes<LiquidationInfo>>

  /**
   * Fetches claim history for a specific wallet.
   * @param wallet The wallet address.
   * @param pageOptions Options for pagination.
   * @param opts Additional options for the API request.
   * @returns A promise that resolves to a paginated response of claim information.
   */
  getClaimHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts
  ): Promise<PaginatedRes<ClaimInfo>>

  /**
   * Fetches a preview of open trades based on order data and existing positions.
   * @param wallet The wallet address.
   * @param orderData Information about the orders.
   * @param existingPos Existing positions.
   * @param opts Additional options for the API request.
   * @returns A promise that resolves to an array of open trade preview information.
   */
  getOpenTradePreview(
    wallet: string,
    orderData: CreateOrder[],
    existingPos: Array<PositionInfo | undefined>,
    opts?: ApiOpts
  ): Promise<OpenTradePreviewInfo[]>

  /**
   * Fetches a preview of closing trades based on position data.
   * @param wallet The wallet address.
   * @param positionInfo Information about the positions to close.
   * @param closePositionData Data for closing positions.
   * @param opts Additional options for the API request.
   * @returns A promise that resolves to an array of close trade preview information.
   */
  getCloseTradePreview(
    wallet: string,
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[],
    opts?: ApiOpts
  ): Promise<CloseTradePreviewInfo[]>

  /**
   * Fetches a preview of margin updates based on deposit or withdrawal actions.
   * @param wallet The wallet address.
   * @param isDeposit Indicates whether the action is a deposit.
   * @param marginDelta Information about the margin change.
   * @param existingPos Existing positions.
   * @param opts Additional options for the API request.
   * @returns A promise that resolves to an array of preview information.
   */
  getUpdateMarginPreview(
    wallet: string,
    isDeposit: boolean[],
    marginDelta: AmountInfo[],
    existingPos: Array<PositionInfo>,
    opts?: ApiOpts
  ): Promise<PreviewInfo[]>

  /**
   * Fetches the total claimable funding for a specific wallet.
   * @param wallet The wallet address.
   * @param opts Additional options for the API request.
   * @returns A promise that resolves to the total claimable funding amount.
   */
  getTotalClaimableFunding(wallet: string, opts?: ApiOpts): Promise<FixedNumber>

  /**
   * Fetches the total accrued funding for a specific wallet.
   * @param wallet The wallet address.
   * @param opts Additional options for the API request.
   * @returns A promise that resolves to the total accrued funding amount.
   */
  getTotalAccuredFunding(wallet: string, opts?: ApiOpts): Promise<FixedNumber>

  /**
   * Fetches account information for a specific wallet.
   * @param wallet The wallet address.
   * @param opts Additional options for the API request.
   * @returns A promise that resolves to an array of account information.
   */
  getAccountInfo(wallet: string, opts?: ApiOpts): Promise<AccountInfo[]>

  /**
   * Fetches the state of multiple markets.
   * @param wallet The wallet address.
   * @param marketIds The IDs of the markets.
   * @param opts Additional options for the API request.
   * @returns A promise that resolves to an array of market states.
   */
  getMarketState(wallet: string, marketIds: Market['marketId'][], opts?: ApiOpts): Promise<MarketState[]>

  /**
   * Fetches the state of multiple agents.
   * @param wallet The wallet address.
   * @param agentParams Parameters for the agents.
   * @param opts Additional options for the API request.
   * @returns A promise that resolves to an array of agent states.
   */
  getAgentState(wallet: string, agentParams: AgentParams[], opts?: ApiOpts): Promise<AgentState[]>

  /**
   * Fetches order books for multiple markets.
   * @dev precision can be undefined, in which case orderbooks for all precisions will be returned
   * @dev precision starts with 1 and goes upto maxPrecision (returned in supportedMarkets()) with 1 being the least precise
   * @param marketIds The IDs of the markets.
   * @param precision The precision of the order books.
   * @param opts Additional options for the API request.
   * @returns A promise that resolves to an array of order books.
   */
  getOrderBooks(
    marketIds: Market['marketId'][],
    precision: (number | undefined)[],
    opts?: ApiOpts
  ): Promise<OrderBook[]>
}
