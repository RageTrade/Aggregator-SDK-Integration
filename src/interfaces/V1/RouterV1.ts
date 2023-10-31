import { FixedNumber } from "ethers-v6";
import { BigNumber, UnsignedTransaction } from "ethers";
import {
  AddressValidationAdditionalSessionData,
  ERC20ApprovalAddtionalSessionData,
} from "../../tx-metadata-types";

// might be able to remove LIMIT_DECREASE and MARKET_DECREASE
export type OrderType = // check for Trigger Order type and modify accordingly
  "LIMIT_INCREASE" | "LIMIT_DECREASE" | "MARKET_INCREASE" | "MARKET_DECREASE";

export type CreateOrderType = "LIMIT" | "MARKET"; // By increase increase

export type CloseOrderType = "STOP_LOSS" | "TAKE_PROFIT" | "MARKET";

export type OrderTYpe = CreateOrderType | CloseOrderType;

export type OrderAction = "CREATE" | "UPDATE" | "CANCEL";

export type ProtocolId = "GMXV1" | "SYNTHETIXV2";

export type TradeOperationType =
  | "Open Long"
  | "Close Long"
  | "Open Short"
  | "Close Short"
  | "Long"
  | "Short";

export type Network = {
  name: string;
  chainId: number;
};

export type Token = {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
};

export type Protocol = {
  protocolId: ProtocolId;
};

export type Market = {
  marketId: string; // Global unique identifier for the market (ChainId:protocolId:protocolMarketId)
  protocolMarketId: string; // Unique identifier for the market within the protocol Hash(Index:Long:Short for gmxV2)
  indexToken: Token;
  longCollateral: Token[];
  shortCollateral: Token[];
  supportedOrderTypes: Record<OrderType, Boolean>;
  supportedOrderActions: Record<OrderAction, Boolean>;
};

export type GenericStaticMarketMetadata = {
  maxLeverage: FixedNumber;
  minLeverage: FixedNumber;
  minInitialMargin: FixedNumber;
  minPositionSize: FixedNumber;
};

// Move to exchange specific file
export type SynV2StaticMarketMetadata = GenericStaticMarketMetadata & {
  address: string;
  asset: string; // check if can be removed
};

export type StaticMarketMetadata =
  | {
      protocolId: "GMXV1";
      data: GenericStaticMarketMetadata;
    }
  | {
      protocolId: "SYNTHETIXV2";
      data: SynV2StaticMarketMetadata;
    };

export type GenericDynamicMarketMetadata = {
  oiLongUsd: FixedNumber;
  oiShortUsd: FixedNumber;
  availableLiquidityLongUSD: FixedNumber;
  availableLiquidityShortUSD: FixedNumber;
};

export type FundingBasedDynamicMarketMetadata = GenericDynamicMarketMetadata & {
  fundingRate: FixedNumber;
};

export type BorrowBasedDynamicMarketMetadata = GenericDynamicMarketMetadata & {
  borrowRate: FixedNumber;
};

export type DynamicMarketMetadata =
  | {
      protocolId: "GMXV1";
      data: BorrowBasedDynamicMarketMetadata;
    }
  | {
      protocolId: "SYNTHETIXV2";
      data: FundingBasedDynamicMarketMetadata;
    };

export type MarketInfo = Market & StaticMarketMetadata & Protocol;

export type TradeDirection = "LONG" | "SHORT";

export type TriggerData = {
  triggerPrice: FixedNumber;
  triggerAboveThreshold: boolean;
};

export type TradeData = {
  direction: TradeDirection;
  sizeDelta: FixedNumber;
  marginDelta: FixedNumber;
};

export type OrderData = TradeData & {
  triggerData: TriggerData | undefined;
};

export type CollateralData = {
  collateral: Token;
};

export type OrderIdentifier = {
  orderId: string;
};

export type CreateOrder = OrderData &
  CollateralData & {
    type: CreateOrderType;
    slippage: string | undefined;
  };

export type UpdateOrder = OrderData &
  OrderIdentifier & {
    type: OrderTYpe;
  };

export type OrderInfo = OrderData &
  OrderIdentifier &
  OrderTYpe &
  CollateralData & {
    marketId: Market["marketId"]; // Global id
    protocolId: ProtocolId;
  };

// for SNX v2, orderIdentifier is same as marketIdentifier
export type CancelOrder = OrderIdentifier & {
  type: OrderTYpe;
};

export type PositionData = {
  posId: string;
  size: FixedNumber;
  margin: FixedNumber;
  accessibleMargin: FixedNumber;
  avgEntryPrice: FixedNumber;
  cumulativeFunding: FixedNumber;
  unrealizedPnl: FixedNumber;
  liquidationPrice: FixedNumber;
  leverage: FixedNumber;
  direction: TradeDirection;
  collateral: Token;
  indexToken: Token;
};

export type PositionInfo = PositionData & {
  marketId: Market["marketId"]; // Global id
  protocolId: ProtocolId;
};

export type GmxPositionInfo = PositionInfo & {
  originalCollateralToken: Token; // can be inferred from market and direction ??
  pnlWithoutFees: FixedNumber;
  closeFee: FixedNumber;
  swapFee: FixedNumber;
  borrowFee: FixedNumber;
  positionFee: FixedNumber;
  collateralAfterFee: FixedNumber;
  delta: FixedNumber;
  hasProfit: boolean;
  entryFundingRate: FixedNumber;
  cumulativeFundingRate: FixedNumber;
  lastUpdatedAt: number;
  fees: FixedNumber;
};

export type SynPositionInfo = PositionInfo & {
  marketAddress: string; // can be taken from marketId
};

export type HistoricalTradeInfo = TradeData &
  CollateralData & {
    marketId: Market["marketId"]; // Global id
    timestamp: number;
    price: FixedNumber;
    realizedPnl: FixedNumber;
    keeperFeesPaid: FixedNumber;
    positionFee: FixedNumber;
    operationType: TradeOperationType;
    txHash: string;
  };

export type LiquidationInfo = CollateralData & {
  marketId: Market["marketId"]; // Global id
  liquidationPrice: FixedNumber;
  direction: TradeDirection;
  sizeClosed: FixedNumber;
  realizedPnl: FixedNumber;
  liquidationFees: FixedNumber;
  remainingCollateral: FixedNumber;
  liqudationLeverage: FixedNumber;
  timestamp: number;
  txHash: string | undefined; // currently undefined for snx
};

export type ClosePositionData = {
  closeSize: FixedNumber;
  type: CloseOrderType;
  triggerData: TriggerData | undefined;
  outputCollateral: Token | undefined;
};

export type UpdatePositionMarginData = CollateralData & {
  margin: FixedNumber;
  isDeposit: boolean;
};

export type ErrorData = {
  isError: boolean;
  errMsg: string;
};

export type PreviewInfo = CollateralData & {
  leverage: FixedNumber;
  size: FixedNumber;
  margin: FixedNumber;
  avgEntryPrice: FixedNumber;
  liqudationPrice: FixedNumber;
  fee: FixedNumber;
} & ErrorData;

export type OpenTradePreviewInfo = PreviewInfo & {
  priceImpact: FixedNumber;
};

export type CloseTradePreviewInfo = PreviewInfo & {
  receiveMargin: FixedNumber;
};

export type PageOptions = {
  limit: number;
  skip: number;
};

export type PaginatedRes<T> = {
  result: T[];
  maxItemsCount: number;
};

export type UnsignedTxWithMetadata =
  | {
      tx: UnsignedTransaction;
      type: "ERC20_APPROVAL";
      data: ERC20ApprovalAddtionalSessionData;
      ethRequired?: BigNumber;
    }
  | {
      tx: UnsignedTransaction;
      type: "GMX_V1";
      data: undefined;
      ethRequired?: BigNumber;
    }
  | {
      tx: UnsignedTransaction;
      type: "LIFI";
      data: undefined;
      ethRequired?: BigNumber;
    }
  | {
      tx: UnsignedTransaction;
      type: "SNX_V2";
      data: undefined;
      ethRequired?: BigNumber;
    }
  | {
      tx: UnsignedTransaction;
      type: "NATIVE";
      data: undefined;
      ethRequired?: BigNumber;
    }
  | {
      tx: UnsignedTransaction;
      type: "ADDRESS";
      data: AddressValidationAdditionalSessionData;
      ethRequired?: BigNumber;
    };

export interface RouterV1 {
  ///// Setup api //////
  setup(swAddr: string): Promise<void>;

  ///// Network api //////
  supportedNetworks(): Network[];

  ///// Protocol api //////
  supportedProtocols(): Protocol[];

  ///// Market api's //////
  supportedMarkets(networks: Network[] | undefined): Promise<MarketInfo[]>;

  getMarketPrice(marketId: Market["marketId"]): Promise<FixedNumber>;

  getMarketInfo(marketId: Market["marketId"]): Promise<MarketInfo>;

  getDynamicMarketMetadata(
    marketId: Market["marketId"]
  ): Promise<DynamicMarketMetadata>;

  ///// Action api's //////
  createIncreaseOrder(
    marketId: Market["marketId"], // Global id
    orderData: CreateOrder
  ): Promise<UnsignedTxWithMetadata[]>;

  updateOrder(
    marketId: Market["marketId"], // Global id
    orderData: UpdateOrder
  ): Promise<UnsignedTxWithMetadata[]>;

  cancelOrder(
    marketId: Market["marketId"], // Global id
    orderData: CancelOrder
  ): Promise<UnsignedTxWithMetadata[]>;

  closePosition(
    marketId: Market["marketId"], // Global id
    positionInfo: PositionInfo,
    closePositionData: ClosePositionData
  ): Promise<UnsignedTxWithMetadata[]>;

  updatePositionMargin(
    marketId: Market["marketId"], // Global id
    positionInfo: PositionInfo,
    updatePositionMarginData: UpdatePositionMarginData
  ): Promise<UnsignedTxWithMetadata[]>;

  ///// Fetching api's //////
  getIdleMargins(wallet: string): Promise<
    Array<
      CollateralData & {
        marketId: Market["marketId"];
        amount: FixedNumber;
      }
    >
  >;

  getAllPositions(
    wallet: string,
    pageOptions: PageOptions | undefined
  ): Promise<PaginatedRes<PositionInfo>>;

  getAllOrders(
    wallet: string,
    pageOptions: PageOptions | undefined
  ): Promise<PaginatedRes<OrderInfo>>;

  getAllOrdersForPosition(
    wallet: string,
    positionInfo: GmxPositionInfo | SynPositionInfo,
    pageOptions: PageOptions | undefined
  ): Promise<PaginatedRes<OrderInfo>>;

  getTradesHistory(
    wallet: string,
    pageOptions: PageOptions | undefined
  ): Promise<PaginatedRes<HistoricalTradeInfo>>;

  getLiquidationHistory(
    wallet: string,
    pageOptions: PageOptions | undefined
  ): Promise<PaginatedRes<LiquidationInfo>>;

  getOpenTradePreview(
    wallet: string,
    marketId: Market["marketId"], // Global id
    orderData: CreateOrder,
    existingPos: PositionInfo | undefined
  ): Promise<OpenTradePreviewInfo>;

  getCloseTradePreview(
    wallet: string,
    marketId: Market["marketId"], // Global id
    positionInfo: PositionInfo,
    closePositionData: ClosePositionData
  ): Promise<CloseTradePreviewInfo>;

  getUpdateMarginPreview(
    wallet: string,
    marketId: Market["marketId"], // Global id
    marginDelta: FixedNumber,
    isDeposit: boolean,
    existingPos: PositionInfo | undefined
  ): Promise<PreviewInfo>;
}
