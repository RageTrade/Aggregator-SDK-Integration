import { BigNumber, BigNumberish, Signer, UnsignedTransaction } from "ethers";

export type Mode = "SYNC" | "ASYNC";

// SNX does not support update order
export type OrderAction = {
  orderAction: "CREATE" | "UPDATE" | "CANCEL";
};

export type OrderType =
  | "LIMIT_INCREASE"
  | "LIMIT_DECREASE"
  | "MARKET_INCREASE"
  | "MARKET_DECREASE"
  | "DEPOSIT"
  | "WITHDRAW";

export type OrderDirection = "LONG" | "SHORT";

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
};

export type Market = {
  mode: Mode;
  longCollateral: Token[];
  shortCollateral: Token[];
  supportedOrderTypes: Record<OrderType, Boolean>;
  supportedOrderActions?: Record<OrderAction["orderAction"], Boolean>;
} & MarketIdentifier;

export type StaticMarketMetadata = {
  maxLeverage?: BigNumber;
  address?: string;
  asset?: string;
  minInitialMargin?: BigNumber;
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
  protocolName?: string;
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
} & CollateralData;

export type ExtendedOrder = Order &
  OrderAction & {
    orderIdentifier: OrderIdentifier;
  };

// at any point in time, there is only one delayed order per market for SNX
export type OrderIdentifier = BigNumberish;

export type OpenMarketData = ExtendedMarket &
  Network & { openMarketIdentifier: string };

export type OpenMarkets = {
  [index: string]: Array<OpenMarketData>;
};

export interface IExchange {
  // something to indicate when setup should be called
  setup(signer: Signer): Promise<void>;

  supportedNetworks(): readonly Network[];

  supportedMarkets(network: Network): Promise<ExtendedMarket[]>;

  createOrder(
    signer: Signer,
    market: ExtendedMarket,
    order: Order
  ): Promise<UnsignedTransaction[]>;

  updateOrder(
    signer: Signer,
    market: ExtendedMarket,
    updatedOrder: Partial<ExtendedOrder>
  ): Promise<UnsignedTransaction[]>;

  cancelOrder(
    signer: Signer,
    market: ExtendedMarket,
    order: Partial<ExtendedOrder>
  ): Promise<UnsignedTransaction[]>;

  closePosition(
    signer: Signer,
    position: ExtendedPosition
  ): Promise<UnsignedTransaction[]>;

  getMarketPrice(market: ExtendedMarket): Promise<BigNumber>;

  getDynamicMetadata(market: ExtendedMarket): Promise<DynamicMarketMetadata>;

  // @dev There can be only 1 order per market per user for SNX
  getOrder(
    user: string,
    orderIdentifier: OrderIdentifier, // serves as market identifier for SNX
    market: ExtendedMarket
  ): Promise<ExtendedOrder>;

  getAllOrders(
    user: string,
    openMarkers?: OpenMarkets
  ): Promise<Array<ExtendedOrder>>;

  // will work as getOrder for SNX
  getMarketOrders(
    user: string,
    market: ExtendedMarket
  ): Promise<Array<ExtendedOrder>>;

  getPosition(
    positionIdentifier: Position["indexOrIdentifier"], // serves as market identifier for SNX
    market: ExtendedMarket,
    user?: string
  ): Promise<ExtendedPosition>;

  getAllPositions(
    user: string,
    signer: Signer,
    openMarkers?: OpenMarkets
  ): Promise<ExtendedPosition[]>;

  getPositionsHistory(positions: Position[]): Promise<ExtendedPosition[]>;

  getIdleMargins(
    user: string
  ): Promise<Array<MarketIdentifier & CollateralData>>;

  getTradePreview(
    user: string,
    signer: Signer,
    market: ExtendedMarket,
    order: Order
  ): Promise<ExtendedPosition>;
}
