import { BigNumber, BigNumberish, UnsignedTransaction, ethers } from "ethers";
import { AddressValidationAdditionalSessionData, AddressValidationSessionKeyData, ERC20ApprovalAddtionalSessionData, ERC20ApprovalSessionKeyData, GMXV1SessionKeyData, LifiSessionKeyData, NativeTokenSessionKeyData, SynthetixV2SessionKeyData } from "./tx-metadata-types";

export type Provider = ethers.providers.Provider;

export type Mode = "SYNC" | "ASYNC";

// SNX does not support update order
export type OrderAction = {
  orderAction: "CREATE" | "UPDATE" | "CANCEL";
};

export type PROTOCOL_NAME = "GMX_V1" | "SYNTHETIX_V2";

export type TRIGGER_TYPE = "STOP_LOSS" | "TAKE_PROFIT" | "NONE";

export type OrderType =
  | "LIMIT_INCREASE"
  | "LIMIT_DECREASE"
  | "MARKET_INCREASE"
  | "MARKET_DECREASE"
  | "DEPOSIT"
  | "WITHDRAW";

export type HistoricalOrderType =
  | OrderType
  | `${OrderType}_EXECUTED`
  | "LIQUIDATED";

export type OrderDirection = "LONG" | "SHORT";

export type ViewError = {
  isError: boolean;
  message: string;
};

export type Network = {
  name: string;
  chainId: number;
};

export type Token = {
  name: string;
  symbol: string;
  decimals: string;
  address: string;
};

export type MarketIdentifier = {
  indexOrIdentifier: string;
  marketToken?: Token;
};

export type Market = {
  mode: Mode;
  longCollateral: Token[];
  shortCollateral: Token[];
  supportedOrderTypes: Record<OrderType, Boolean>;
  supportedOrderActions?: Record<OrderAction["orderAction"], Boolean>;
} & MarketIdentifier;

export type NumberDecimal = {
  value: string;
  decimals: number;
};

export type StaticMarketMetadata = {
  maxLeverage?: NumberDecimal;
  address?: string;
  asset?: string;
  minInitialMargin?: NumberDecimal;
  minPositionSize?: NumberDecimal;
  minLeverage?: NumberDecimal;
};

export type DynamicMarketMetadata = {
  price?: BigNumber;
  oiLong?: BigNumber;
  oiShort?: BigNumber;
  oiTotal?: BigNumber;
  fundingRate?: BigNumber;
  fundingVelocity?: BigNumber;
  borrowRate?: BigNumber;
  makerFee?: BigNumber;
  takerFee?: BigNumber;
  availableLiquidity?: BigNumber;
  availableLiquidityLongUSD?: BigNumber;
  availableLiquidityShortUSD?: BigNumber;
  oiLongUsd: BigNumber;
  oiShortUsd: BigNumber;
  marketLimitUsd: BigNumber;
  marketLimitNative: BigNumber;
};

export type ProtocolMetadata = {
  protocolName: PROTOCOL_NAME;
};

export type ExtendedMarket = Market & StaticMarketMetadata & ProtocolMetadata;

export type Position = {
  indexOrIdentifier: string;
  size: BigNumber;
  collateral: BigNumber;
  // find equivalent on SNX
  averageEntryPrice: BigNumber;
  // verify accrued funding for SNX
  cumulativeFunding?: BigNumber;
  // check for SNX
  lastUpdatedAtTimestamp?: number;
};

export type ExtendedPosition = Position & {
  unrealizedPnl?: BigNumber;
  liqudationPrice?: BigNumber;
  otherFees?: BigNumber;
  fee?: BigNumber;
  leverage?: BigNumber;
  status?: number;
  priceImpact?: BigNumber;
  exceedsPriceProtection?: boolean;
  sizeDelta?: BigNumber;
  skewAdjustedPrice?: BigNumber;
  direction?: OrderDirection;
  accessibleMargin?: BigNumber;
  marketAddress?: string;
  originalCollateralToken?: string;
  indexToken?: Token;
  collateralToken: Token;
  pnlwithoutfees?: BigNumber;
  closeFee?: BigNumber;
  swapFee?: BigNumber;
  borrowFee?: BigNumber;
  positionFee?: BigNumber;
  collateralAfterFee?: BigNumber;
  delta?: BigNumber;
  hasProfit?: boolean;
  marketIdentifier?: MarketIdentifier["indexOrIdentifier"];
  entryFundingRate?: BigNumber;
  cumulativeFundingRate?: BigNumber;
  protocolMetadata?: ProtocolMetadata;
  receiveAmount?: BigNumber;
  receiveUsd?: BigNumber;
  isError?: boolean;
  error?: string;
};

export type Trade = ExtendedPosition & {
  isLiquidated?: boolean;
  totalDeposits?: BigNumber;
  positionClosed?: boolean;
  keeperFeesPaid?: BigNumber;
  pnl?: BigNumber;
  txHash?: string;
  txLink?: string;
};

export type TradeHistory = {
  marketIdentifier: MarketIdentifier;
  timestamp: number;
  operation: string;
  sizeDelta: BigNumber;
  direction?: OrderDirection;
  price: BigNumber;
  collateralDelta: BigNumber;
  realisedPnl: BigNumber;
  keeperFeesPaid?: BigNumber;
  isTriggerAboveThreshold?: Boolean;
  txHash: string;
};

export type CollateralData = {
  inputCollateral: Token;
  inputCollateralAmount: BigNumber;
  shouldWrap?: boolean;
};

export type Order = {
  // check for GMX how frontend will know if it MI or MD
  type: OrderType;
  direction: OrderDirection;

  // in SNX cannot update size and collateral delta in same call
  sizeDelta: BigNumber;
  isTriggerOrder: Boolean;
  referralCode: string | undefined;
  trigger:
    | {
        triggerPrice: BigNumber;
        triggerAboveThreshold: boolean;
      }
    | undefined;
  slippage: string | undefined;
} & CollateralData;

export type ExtendedOrder = Order &
  OrderAction & {
    orderIdentifier: OrderIdentifier;
  } & MarketIdentifier & {
    triggerType: TRIGGER_TYPE;
  };

// at any point in time, there is only one delayed order per market for SNX
export type OrderIdentifier = BigNumberish;

export type OpenMarketData = ExtendedMarket &
  Network & { openMarketIdentifier: string };

export type OpenMarkets = {
  [index: string]: Array<OpenMarketData>;
};

export type UnsignedTxWithMetadata =
  { tx: UnsignedTransaction, sessionKeyData: ERC20ApprovalSessionKeyData & { type: "ERC20_APPROVAL" }, additionalSessionData: ERC20ApprovalAddtionalSessionData } |
  { tx: UnsignedTransaction, sessionKeyData: GMXV1SessionKeyData & { type: "GMX_V1" }, additionalSessionData: undefined } |
  { tx: UnsignedTransaction, sessionKeyData: LifiSessionKeyData & { type: "LIFI" }, additionalSessionData: undefined } |
  { tx: UnsignedTransaction, sessionKeyData: SynthetixV2SessionKeyData & { type: "SNX_V2" }, additionalSessionData: undefined } |
  { tx: UnsignedTransaction, sessionKeyData: NativeTokenSessionKeyData & { type: "NATIVE" }, additionalSessionData: undefined } |
  { tx: UnsignedTransaction, sessionKeyData: AddressValidationSessionKeyData & { type: "ADDRESS" }, additionalSessionData: AddressValidationAdditionalSessionData }

export const DEFAULT_SESSION_KEY = ethers.constants.AddressZero;

export interface IExchange {
  // something to indicate when setup should be called
  setup(provider: Provider): Promise<UnsignedTxWithMetadata[]>;

  supportedNetworks(): readonly Network[];

  supportedMarkets(network: Network): Promise<ExtendedMarket[]>;

  createOrder(
    provider: Provider,
    market: ExtendedMarket,
    order: Order
  ): Promise<UnsignedTxWithMetadata[]>;

  updateOrder(
    provider: Provider,
    market: ExtendedMarket | undefined,
    updatedOrder: Partial<ExtendedOrder>
  ): Promise<UnsignedTxWithMetadata[]>;

  cancelOrder(
    provider: Provider,
    market: ExtendedMarket | undefined,
    order: Partial<ExtendedOrder>
  ): Promise<UnsignedTxWithMetadata[]>;

  closePosition(
    provider: Provider,
    position: ExtendedPosition,
    closeSize: BigNumber,
    isTrigger: boolean,
    triggerPrice: BigNumber | undefined,
    triggerAboveThreshold: boolean | undefined,
    outputToken: Token | undefined
  ): Promise<UnsignedTxWithMetadata[]>;

  updatePositionMargin(
    provider: Provider,
    position: ExtendedPosition,
    marginAmount: BigNumber,
    isDeposit: boolean,
    transferToken: Token | undefined
  ): Promise<UnsignedTxWithMetadata[]>;

  getMarketPrice(market: ExtendedMarket): Promise<NumberDecimal>;

  getDynamicMetadata(
    market: ExtendedMarket,
    provider?: Provider
  ): Promise<DynamicMarketMetadata>;

  // @dev There can be only 1 order per market per user for SNX
  getOrder(
    user: string,
    orderIdentifier: OrderIdentifier, // serves as market identifier for SNX
    market: ExtendedMarket
  ): Promise<ExtendedOrder>;

  getAllOrders(
    user: string,
    provider: Provider,
    openMarkers: OpenMarkets | undefined
  ): Promise<Array<ExtendedOrder>>;

  getAllOrdersForPosition(
    user: string,
    provider: Provider,
    position: ExtendedPosition,
    openMarkers: OpenMarkets | undefined
  ): Promise<Array<ExtendedOrder>>;

  // will work as getOrder for SNX
  getMarketOrders(
    user: string,
    market: ExtendedMarket
  ): Promise<Array<ExtendedOrder>>;

  getPosition(
    positionIdentifier: Position["indexOrIdentifier"], // serves as market identifier for SNX
    market: ExtendedMarket,
    user: string | undefined
  ): Promise<ExtendedPosition>;

  getAllPositions(
    user: string,
    provider: Provider,
    openMarkers: OpenMarkets | undefined
  ): Promise<ExtendedPosition[]>;

  getTradesHistory(
    user: string,
    openMarkers: OpenMarkets | undefined
  ): Promise<TradeHistory[]>;

  getLiquidationsHistory(
    user: string,
    openMarkers: OpenMarkets | undefined
  ): Promise<TradeHistory[]>;

  getIdleMargins(
    user: string,
    openMarkets: OpenMarkets | undefined
  ): Promise<Array<MarketIdentifier & CollateralData>>;

  getTradePreview(
    user: string,
    provider: Provider,
    market: ExtendedMarket,
    order: Order,
    existingPosition: ExtendedPosition | undefined
  ): Promise<ExtendedPosition>;

  getCloseTradePreview(
    user: string,
    provider: Provider,
    position: ExtendedPosition,
    closeSize: BigNumber,
    isTrigger: boolean,
    triggerPrice: BigNumber | undefined,
    triggerAboveThreshold: boolean | undefined,
    outputToken: Token | undefined
  ): Promise<ExtendedPosition>;

  getEditCollateralPreview(
    user: string,
    provider: Provider,
    position: ExtendedPosition,
    marginDelta: BigNumber,
    isDeposit: boolean
  ): Promise<ExtendedPosition>;
}
