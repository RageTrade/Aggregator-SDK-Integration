import { BigNumber, BigNumberish, Signer, UnsignedTransaction } from "ethers";

export type Mode = "SYNC" | "ASYNC";

// SNX does not support update order
export type OrderAction = "CREATE" | "UPDATE" | "CANCEL";

export type OrderType =
  | "LIMIT_INCREASE"
  | "LIMIT_DECREASE"
  | "MARKET_INCREASE"
  | "MARKET_DECREASE";

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
  indexOrIdentifier: Token["address"];
  supportedOrderTypes: Record<OrderType, Boolean>;
};

export type Position = {
  indexOrIdentifier: string;
  size: BigNumber;
  collateral: BigNumber;
  // find equivalent on SNX
  averageEntryPrice: BigNumber;
  // verify accrued funding for SNX
  cumulativeFunding: BigNumber;
  // check for SNX
  lastUpdatedAtTimestamp: number;
};

export type ExtendedPosition = Position & {
  unrealizedPnl: BigNumber;
  liqudationPrice: BigNumber;
  otherFees?: BigNumber;
};

export type Order = {
  // check for GMX how frontend will know if it MI or MD
  type: OrderType;
  direction: OrderDirection;
  inputCollateral: Token;
  inputCollateralAmount: BigNumber;
  // in SNX cannot update size and collateral delta in same call
  sizeDelta: BigNumber;
  isTriggerOrder: Boolean;
  referralCode: string | undefined;
  trigger:
    | {
        triggerPrice: BigNumber;
        triggerAboveThreshold: Boolean;
      }
    | undefined;
};

// at any point in time, there is only one delayed order per market
export type OrderIdentifier = BigNumberish;

export interface IExchange {
  // something to indicate when setup should be called
  setup(signer: Signer): Promise<void>;
  supportedNetworks(): readonly Network[];
  supportedMarkets(network: Network): Promise<readonly Market[]>;
  createOrder(
    signer: Signer,
    market: Market,
    order: Order
  ): Promise<UnsignedTransaction>;
  updateOrder(
    singer: Signer,
    market: Market,
    orderIdentifier: OrderIdentifier,
    updatedOrder: Partial<Order>
  ): Promise<UnsignedTransaction>;
  cancelOrder(
    signer: Signer,
    market: Market,
    orderIdentifier: OrderIdentifier
  ): Promise<UnsignedTransaction>;
  getOrder(
    orderIdentifier: OrderIdentifier
  ): Promise<Array<Order & OrderAction & OrderIdentifier>>;
  getOrders(
    user: string
  ): Promise<Array<Order & OrderAction & OrderIdentifier>>;
  getOrders(
    user: string,
    market: Market["indexOrIdentifier"]
  ): Promise<Array<Order & OrderAction & OrderIdentifier>>;
  getPosition(
    positionIdentifier: Position["indexOrIdentifier"]
  ): Promise<Position>;
  getPositions(user: string): Promise<Position[]>;
  getPositions(
    user: string,
    market: Market["indexOrIdentifier"]
  ): Promise<Position[]>;
  getExtendedPositions(positions: Position[]): Promise<ExtendedPosition[]>;
}
