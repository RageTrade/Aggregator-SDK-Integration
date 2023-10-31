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

export type GenericMarketMetadata = {
  maxLeverage: FixedNumber;
  minLeverage: FixedNumber;
  minInitialMargin: FixedNumber;
  minPositionSize: FixedNumber;
};

// Move to separate file
export type SynV2MarketMetadata = GenericMarketMetadata & {
  address: string;
  asset: string; // check if can be removed
};

export type MarketMetadata =
  | {
      protocolId: "GMXV1";
      data: GenericMarketMetadata;
    }
  | {
      protocolId: "SYNTHETIXV2";
      data: SynV2MarketMetadata;
    };

export type MarketInfo = Market & MarketMetadata & Protocol;

export type OrderDirection = "LONG" | "SHORT";

export type Order = {
  type: CreateOrderType;
  direction: OrderDirection;
  sizeDelta: FixedNumber; // User inputs
  marginDelta: FixedNumber; // User inputs
  trigger:
    | {
        triggerPrice: BigNumber;
        triggerAboveThreshold: boolean;
      }
    | undefined;
};

export type CollateralData = {
  inputCollateral: Token;
};

export type CreateOrder = Order &
  CollateralData & {
    slippage: string | undefined;
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
  supportedNetworks(): Network[];

  supportedMarkets(networks: Network[] | undefined): Promise<MarketInfo[]>;

  createOrder(
    marketId: Market["marketId"], // Global id
    order: CreateOrder
  ): Promise<UnsignedTxWithMetadata[]>;
}
