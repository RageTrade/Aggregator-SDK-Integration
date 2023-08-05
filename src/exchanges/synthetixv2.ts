import KwentaSDK from "@kwenta/sdk";
import { Signer, BigNumber, UnsignedTransaction, BigNumberish } from "ethers";
import {
  ExtendedPosition,
  IExchange,
  Market,
  Mode,
  Order,
  OrderAction,
  OrderDirection,
  OrderType,
  Token,
  MarketIdentifier,
  CollateralData,
  Position,
  OrderIdentifier,
  ExtendedOrder,
} from "../interface";
import { wei } from "@synthetixio/wei";
import {
  ContractOrderType,
  FuturesMarket,
  FuturesMarketKey,
  PositionSide,
} from "@kwenta/sdk/dist/types";

export default class SynthetixV2Service implements IExchange {
  private nId = 10;
  private sdk: KwentaSDK;
  private sUSDAddr = "0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9";
  private token: Token = {
    name: "Synthetix USD",
    symbol: "sUSD",
    decimals: "18",
    address: this.sUSDAddr,
  };

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

  async supportedMarkets(network: {
    name: string;
    chainId: number;
  }): Promise<readonly Market[]> {
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
        DEPOSIT: true,
        WITHDRAW: true,
      },
      supportedOrderActions: {
        CREATE: true,
        UPDATE: false,
        CANCEL: true,
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
    if (order.type == "DEPOSIT" || order.type == "WITHDRAW") {
      let transferAmount = wei(order.inputCollateralAmount);
      transferAmount =
        order.type == "DEPOSIT" ? transferAmount : transferAmount.neg();

      return (await this.sdk.futures.depositIsolatedMargin(
        targetMarket.market!,
        transferAmount
      )) as UnsignedTransaction;
    } else if (
      order.type == "MARKET_INCREASE" ||
      order.type == "MARKET_DECREASE"
    ) {
      // proper orders
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
    signer: Signer,
    market: {
      mode: Mode;
      longCollateral: string;
      shortCollateral: string;
      indexOrIdentifier: string;
      supportedOrderTypes: Record<OrderType, Boolean>;
    },
    updatedOrder: Partial<ExtendedOrder>
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
    order: Partial<ExtendedOrder>
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

  async getIdleMargins(
    user: string
  ): Promise<(MarketIdentifier & CollateralData)[]> {
    const result = await this.sdk.futures.getIdleMarginInMarkets(user);

    return result.marketsWithIdleMargin.map((m) => ({
      indexOrIdentifier: FuturesMarketKey[m.marketKey].toString(),
      inputCollateral: this.token,
      inputCollateralAmount: m.position.accessibleMargin.toBN(),
    }));
  }

  async getTradePreview(
    signer: Signer,
    market: Market,
    order: Order
  ): Promise<ExtendedPosition> {
    const targetMarket = await this.findMarketByKey(market.indexOrIdentifier);
    if (!targetMarket) {
      throw new Error("Market not found");
    }

    await this.sdk.setSigner(signer);

    if (order.type == "MARKET_INCREASE" || order.type == "MARKET_DECREASE") {
      let sizeDelta = wei(order.sizeDelta);
      sizeDelta = order.type == "MARKET_INCREASE" ? sizeDelta : sizeDelta.neg();

      const tradePreview = await this.sdk.futures.getIsolatedTradePreview(
        targetMarket.market,
        targetMarket.marketKey,
        ContractOrderType.DELAYED_OFFCHAIN,
        {
          sizeDelta: sizeDelta,
          price: wei(order.trigger!.triggerPrice),
          leverageSide:
            order.type == "MARKET_INCREASE"
              ? PositionSide.LONG
              : PositionSide.SHORT,
        }
      );

      return {
        indexOrIdentifier: "",
        size: tradePreview.size.toBN(),
        collateral: tradePreview.margin.toBN(),
        averageEntryPrice: tradePreview.price.toBN(),
        liqudationPrice: tradePreview.liqPrice.toBN(),
        otherFees: tradePreview.fee.toBN(),
        sizeDelta: tradePreview.sizeDelta.toBN(),
        leverage: tradePreview.leverage.toBN(),
        status: tradePreview.status,
        priceImpact: tradePreview.priceImpact.toBN(),
        exceedsPriceProtection: tradePreview.exceedsPriceProtection,
        skewAdjustedPrice: tradePreview.skewAdjustedPrice.toBN(),
      };
    }

    throw new Error("Invalid order type");
  }

  async getOrder(
    user: string,
    orderIdentifier: OrderIdentifier // serves as market identifier for SNX
  ): Promise<ExtendedOrder> {
    const targetMarket = await this.findMarketByKey(orderIdentifier.toString());
    if (!targetMarket) {
      throw new Error("Market not found");
    }

    const orderData = await this.sdk.futures.getDelayedOrder(
      user,
      targetMarket.market
    );

    if (orderData.size.eq(0)) {
      return {} as ExtendedOrder;
    }

    const order: Order = {
      type:
        orderData.side == PositionSide.LONG
          ? "MARKET_INCREASE"
          : "MARKET_DECREASE",
      direction: orderData.side == PositionSide.LONG ? "LONG" : "SHORT",
      sizeDelta: orderData.size.toBN(),
      isTriggerOrder: false,
      referralCode: undefined,
      trigger: {
        triggerPrice: orderData.desiredFillPrice.toBN(),
        triggerAboveThreshold: true,
      },
      inputCollateral: this.token,
      inputCollateralAmount: orderData.commitDeposit.toBN(),
    };

    const orderAction: OrderAction = { orderAction: "CREATE" };

    return {
      ...order,
      ...orderAction,
      ...{
        orderIdentifier: orderIdentifier.toString(),
      },
    };
  }

  async getAllOrders(user: string): Promise<Array<ExtendedOrder>> {
    const markets = (await this.sdk.futures.getMarkets()).filter(
      (m) => m.isSuspended == false
    );

    let ordersData: ExtendedOrder[] = [];
    markets.forEach(async (m) => {
      let orderData = await this.getOrder(user, m.marketKey);
      if (orderData.orderIdentifier) {
        ordersData.push(orderData);
      }
    });

    return ordersData;
  }

  // will work as getOrder for SNX
  async getMarketOrders(
    user: string,
    market: Market["indexOrIdentifier"]
  ): Promise<Array<ExtendedOrder>> {
    let ordersData: ExtendedOrder[] = [];

    ordersData.push(await this.getOrder(user, market.toString()));

    return ordersData;
  }

  getPosition(
    positionIdentifier: Position["indexOrIdentifier"] // serves as market identifier for SNX
  ): Promise<Position> {
    throw new Error("Method not Supported.");
  }

  getAllPositions(user: string): Promise<Position[]> {
    throw new Error("Method not Supported.");
  }

  // will work as getPosition for SNX
  getMarketPositions(
    user: string,
    market: Market["indexOrIdentifier"]
  ): Promise<Position[]> {
    throw new Error("Method not Supported.");
  }

  getPositionsHistory(positions: Position[]): Promise<ExtendedPosition[]> {
    throw new Error("Method not Supported.");
  }
}
