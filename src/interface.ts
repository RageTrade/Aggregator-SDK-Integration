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

export type Market = {
  mode: Mode;
  longCollateral: Token["address"];
  shortCollateral: Token["address"];
  supportedOrderTypes: Record<OrderType, Boolean>;
  supportedOrderActions?: Record<OrderAction["orderAction"], Boolean>;
} & MarketIdentifier;

export type MarketMetadata = {
  asset?: string;
  price?: BigNumber;
  oiLong?: BigNumber;
  oiShort?: BigNumber;
  oiTotal?: BigNumber;
  fundingRate?: BigNumber;
  fundingVelocity?: BigNumber;
  borrowRate?: BigNumber;
  makerFee?: BigNumber;
  takerFee?: BigNumber;
  maxLeverage?: BigNumber;
  address?: string;
};

export type ExtendedMarket = Market & MarketMetadata;

export type MarketIdentifier = {
  indexOrIdentifier: string;
};

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

export interface IExchange {
  // something to indicate when setup should be called
  setup(signer: Signer): Promise<void>;

  supportedNetworks(): readonly Network[];

  supportedMarkets(network: Network): Promise<readonly ExtendedMarket[]>;

  createOrder(
    signer: Signer,
    market: Market,
    order: Order
  ): Promise<UnsignedTransaction[]>;

  updateOrder(
    signer: Signer,
    market: Market,
    updatedOrder: Partial<ExtendedOrder>
  ): Promise<UnsignedTransaction[]>;

  cancelOrder(
    signer: Signer,
    market: Market,
    order: Partial<ExtendedOrder>
  ): Promise<UnsignedTransaction[]>;

  getMarketPrice(market: Market): Promise<BigNumber>;

  // @dev There can be only 1 order per market per user for SNX
  getOrder(
    user: string,
    orderIdentifier: OrderIdentifier // serves as market identifier for SNX
  ): Promise<ExtendedOrder>;

  getAllOrders(user: string): Promise<Array<ExtendedOrder>>;

  // will work as getOrder for SNX
  getMarketOrders(
    user: string,
    market: Market["indexOrIdentifier"]
  ): Promise<Array<ExtendedOrder>>;

  getPosition(
    positionIdentifier: Position["indexOrIdentifier"], // serves as market identifier for SNX
    user?: string
  ): Promise<ExtendedPosition>;

  getAllPositions(user: string, signer: Signer): Promise<ExtendedPosition[]>;

  // will work as getPosition for SNX
  getMarketPositions(
    user: string,
    market: Market["indexOrIdentifier"]
  ): Promise<Position[]>;

  getPositionsHistory(positions: Position[]): Promise<ExtendedPosition[]>;

  getIdleMargins(
    user: string
  ): Promise<Array<MarketIdentifier & CollateralData>>;

  getTradePreview(
    signer: Signer,
    market: Market,
    order: Order
  ): Promise<ExtendedPosition>;
}
