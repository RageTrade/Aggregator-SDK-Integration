import KwentaSDK from "@kwenta/sdk";
import { Signer, BigNumber, UnsignedTransaction, BigNumberish } from "ethers";
import {
  IExchange,
  Mode,
  OrderAction,
  OrderDirection,
  OrderType,
} from "../interface";
import { wei } from "@synthetixio/wei";
import { FuturesMarket } from "@kwenta/sdk/dist/types";

export default class SynthetixV2Service implements IExchange {
  private nId = 10;
  private sdk: KwentaSDK;
  private sUSDAddr = "0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9";

  constructor(sdk: KwentaSDK) {
    this.sdk = sdk;
  }

  async findMarketByKey(marketKey: string): Promise<FuturesMarket | undefined> {
    // find the market
    const markets = await this.sdk.futures.getMarkets();
    return markets.find((m) => m.marketKey == marketKey);
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
        LIMIT_INCREASE: true,
        LIMIT_DECREASE: true,
        MARKET_INCREASE: true,
        MARKET_DECREASE: true,
      },
    }));
  }

  async createOrder(
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
    const targetMarket = await this.findMarketByKey(market.indexOrIdentifier);
    if (!targetMarket) {
      throw new Error("Market not found");
    }

    await this.sdk.setSigner(signer);

    // transfer margin orders
    if (order.type == "LIMIT_INCREASE" || order.type == "LIMIT_DECREASE") {
      let transferAmount = wei(order.inputCollateralAmount);
      transferAmount =
        order.type == "LIMIT_INCREASE" ? transferAmount : transferAmount.neg();

      return (await this.sdk.futures.depositIsolatedMargin(
        targetMarket.market!,
        transferAmount
      )) as UnsignedTransaction;
    }

    // proper orders
    if (order.type == "MARKET_INCREASE" || order.type == "MARKET_DECREASE") {
      let sizeDelta = wei(order.sizeDelta);
      sizeDelta = order.type == "MARKET_INCREASE" ? sizeDelta : sizeDelta.neg();

      return (await this.sdk.futures.submitIsolatedMarginOrder(
        targetMarket.market,
        sizeDelta,
        wei(order.trigger?.triggerPrice)
      )) as UnsignedTransaction;
    }

    throw new Error("Invalid order type");
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
    throw new Error("Method not Supported.");
  }

  async cancelOrder(
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
    const targetMarket = await this.findMarketByKey(market.indexOrIdentifier);
    if (!targetMarket) {
      throw new Error("Market not found");
    }

    return await this.sdk.futures.cancelDelayedOrder(
      targetMarket.market,
      await signer.getAddress(),
      true
    );
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
