import KwentaSDK from "@kwenta/sdk";
import { Signer, BigNumber, UnsignedTransaction, BigNumberish } from "ethers";
import {
  IExchange,
  Mode,
  OrderAction,
  OrderDirection,
  OrderType,
} from "../interface";

export default class SynthetixV2Service implements IExchange {
  private nId = 10;
  private sdk: KwentaSDK;
  private sUSDAddr = "0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9";

  constructor(sdk: KwentaSDK) {
    this.sdk = sdk;
  }

  setup(signer: Signer): Promise<void> {
    return Promise.resolve();
  }

  supportedNetworks(): readonly { name: string; chainId: number }[] {
    return [
      {
        name: "optimism",
        chainId: this.nId,
      },
    ];
  }

  async supportedMarkets(network: { name: string; chainId: number }): Promise<
    readonly {
      mode: Mode;
      longCollateral: string;
      shortCollateral: string;
      indexOrIdentifier: string;
      supportedOrderTypes: Record<OrderType, Boolean>;
    }[]
  > {
    const markets = await this.sdk.futures.getMarkets();

    return markets.map((m) => ({
      mode: "ASYNC",
      longCollateral: this.sUSDAddr,
      shortCollateral: this.sUSDAddr,
      indexOrIdentifier: m.marketKey,
      supportedOrderTypes: {
        LIMIT_INCREASE: false,
        LIMIT_DECREASE: false,
        MARKET_INCREASE: true,
        MARKET_DECREASE: true,
      },
    }));
  }

  createOrder(
    signer: Signer,
    market: {
      mode: Mode;
      longCollateral: string;
      shortCollateral: string;
      indexOrIdentifier: string;
      supportedOrderTypes: Record<OrderType, Boolean>;
    },
    order: {
      type: OrderType;
      direction: OrderDirection;
      inputCollateral: {
        name: string;
        symbol: string;
        decimals: string;
        address: string;
      };
      inputCollateralAmount: BigNumber;
      sizeDelta: BigNumber;
      isTriggerOrder: Boolean;
      referralCode: string | undefined;
      trigger:
        | { triggerPrice: BigNumber; triggerAboveThreshold: Boolean }
        | undefined;
    }
  ): Promise<UnsignedTransaction> {
    throw new Error("Method not implemented.");
  }

  updateOrder(
    singer: Signer,
    market: {
      mode: Mode;
      longCollateral: string;
      shortCollateral: string;
      indexOrIdentifier: string;
      supportedOrderTypes: Record<OrderType, Boolean>;
    },
    orderIdentifier: BigNumberish,
    updatedOrder: Partial<{
      type: OrderType;
      direction: OrderDirection;
      inputCollateral: {
        name: string;
        symbol: string;
        decimals: string;
        address: string;
      };
      inputCollateralAmount: BigNumber;
      sizeDelta: BigNumber;
      isTriggerOrder: Boolean;
      referralCode: string | undefined;
      trigger:
        | { triggerPrice: BigNumber; triggerAboveThreshold: Boolean }
        | undefined;
    }>
  ): Promise<UnsignedTransaction> {
    throw new Error("Method not implemented.");
  }

  cancelOrder(
    signer: Signer,
    market: {
      mode: Mode;
      longCollateral: string;
      shortCollateral: string;
      indexOrIdentifier: string;
      supportedOrderTypes: Record<OrderType, Boolean>;
    },
    orderIdentifier: BigNumberish
  ): Promise<UnsignedTransaction> {
    throw new Error("Method not implemented.");
  }

  getOrder(orderIdentifier: BigNumberish): Promise<
    ({
      type: OrderType;
      direction: OrderDirection;
      inputCollateral: {
        name: string;
        symbol: string;
        decimals: string;
        address: string;
      };
      inputCollateralAmount: BigNumber;
      sizeDelta: BigNumber;
      isTriggerOrder: Boolean;
      referralCode: string | undefined;
      trigger:
        | { triggerPrice: BigNumber; triggerAboveThreshold: Boolean }
        | undefined;
    } & OrderAction &
      BigNumberish)[]
  > {
    throw new Error("Method not implemented.");
  }

  getOrders(user: string): Promise<
    ({
      type: OrderType;
      direction: OrderDirection;
      inputCollateral: {
        name: string;
        symbol: string;
        decimals: string;
        address: string;
      };
      inputCollateralAmount: BigNumber;
      sizeDelta: BigNumber;
      isTriggerOrder: Boolean;
      referralCode: string | undefined;
      trigger:
        | { triggerPrice: BigNumber; triggerAboveThreshold: Boolean }
        | undefined;
    } & OrderAction &
      BigNumberish)[]
  >;

  getOrders(
    user: string,
    market: string
  ): Promise<
    ({
      type: OrderType;
      direction: OrderDirection;
      inputCollateral: {
        name: string;
        symbol: string;
        decimals: string;
        address: string;
      };
      inputCollateralAmount: BigNumber;
      sizeDelta: BigNumber;
      isTriggerOrder: Boolean;
      referralCode: string | undefined;
      trigger:
        | { triggerPrice: BigNumber; triggerAboveThreshold: Boolean }
        | undefined;
    } & OrderAction &
      BigNumberish)[]
  >;

  getOrders(
    user: unknown,
    market?: unknown
  ): Promise<
    ({
      type: OrderType;
      direction: OrderDirection;
      inputCollateral: {
        name: string;
        symbol: string;
        decimals: string;
        address: string;
      };
      inputCollateralAmount: import("ethers").BigNumber;
      sizeDelta: import("ethers").BigNumber;
      isTriggerOrder: Boolean;
      referralCode: string | undefined;
      trigger:
        | {
            triggerPrice: import("ethers").BigNumber;
            triggerAboveThreshold: Boolean;
          }
        | undefined;
    } & OrderAction &
      import("ethers").BigNumberish)[]
  > {
    throw new Error("Method not implemented.");
  }

  getPosition(positionIdentifier: string): Promise<{
    indexOrIdentifier: string;
    size: BigNumber;
    collateral: BigNumber;
    averageEntryPrice: BigNumber;
    cumulativeFunding: BigNumber;
    lastUpdatedAtTimestamp: number;
  }> {
    throw new Error("Method not implemented.");
  }

  getPositions(user: string): Promise<
    {
      indexOrIdentifier: string;
      size: BigNumber;
      collateral: BigNumber;
      averageEntryPrice: BigNumber;
      cumulativeFunding: BigNumber;
      lastUpdatedAtTimestamp: number;
    }[]
  >;

  getPositions(
    user: string,
    market: string
  ): Promise<
    {
      indexOrIdentifier: string;
      size: BigNumber;
      collateral: BigNumber;
      averageEntryPrice: BigNumber;
      cumulativeFunding: BigNumber;
      lastUpdatedAtTimestamp: number;
    }[]
  >;

  getPositions(
    user: unknown,
    market?: unknown
  ): Promise<
    {
      indexOrIdentifier: string;
      size: import("ethers").BigNumber;
      collateral: import("ethers").BigNumber;
      averageEntryPrice: import("ethers").BigNumber;
      cumulativeFunding: import("ethers").BigNumber;
      lastUpdatedAtTimestamp: number;
    }[]
  > {
    throw new Error("Method not implemented.");
  }

  getExtendedPositions(
    positions: {
      indexOrIdentifier: string;
      size: BigNumber;
      collateral: BigNumber;
      averageEntryPrice: BigNumber;
      cumulativeFunding: BigNumber;
      lastUpdatedAtTimestamp: number;
    }[]
  ): Promise<
    ({
      indexOrIdentifier: string;
      size: BigNumber;
      collateral: BigNumber;
      averageEntryPrice: BigNumber;
      cumulativeFunding: BigNumber;
      lastUpdatedAtTimestamp: number;
    } & {
      unrealizedPnl: BigNumber;
      liqudationPrice: BigNumber;
      otherFees?: BigNumber | undefined;
    })[]
  > {
    throw new Error("Method not implemented.");
  }
}
