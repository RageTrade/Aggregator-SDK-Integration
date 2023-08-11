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
  ExtendedMarket,
  MarketMetadata,
} from "../interface";
import { wei } from "@synthetixio/wei";
import {
  ContractOrderType,
  FuturesMarket,
  FuturesMarketKey,
  PositionSide,
} from "@kwenta/sdk/dist/types";
import {
  FuturesMarketAsset,
  FuturesPosition,
} from "@kwenta/sdk/dist/types/futures";
import {
  getEnumEntryByValue,
  getEnumKeyByEnumValue,
  logObject,
} from "../common/helper";

export default class SynthetixV2Service implements IExchange {
  private opChainId = 10;
  private sdk: KwentaSDK;
  private sUSDAddr = "0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9";
  private token: Token = {
    name: "Synthetix USD",
    symbol: "sUSD",
    decimals: "18",
    address: this.sUSDAddr,
  };
  private swAddr: string;
  private protocolIdentifier = "synthetixV2";

  constructor(sdk: KwentaSDK, _swAddr: string) {
    this.sdk = sdk;
    this.swAddr = _swAddr;
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
        chainId: this.opChainId,
      },
    ];
  }

  async supportedMarkets(network: {
    name: string;
    chainId: number;
  }): Promise<readonly ExtendedMarket[]> {
    const markets = await this.sdk.futures.getMarkets();

    let extendedMarkets: ExtendedMarket[] = [];

    markets.forEach((m) => {
      let extendedMarket: ExtendedMarket = {
        mode: "ASYNC",
        longCollateral: [this.token],
        shortCollateral: [this.token],
        indexOrIdentifier: m.marketKey,
        supportedOrderTypes: {
          LIMIT_INCREASE: false,
          LIMIT_DECREASE: false,
          MARKET_INCREASE: true,
          MARKET_DECREASE: true,
          DEPOSIT: false,
          WITHDRAW: false,
        },
        supportedOrderActions: {
          CREATE: true,
          UPDATE: false,
          CANCEL: true,
        },
        asset: m.asset,
        address: m.market,
        oiLong: m.openInterest.long.toBN(),
        oiShort: m.openInterest.short.toBN(),
        fundingRate: m.currentFundingRate.toBN(),
        fundingVelocity: m.currentFundingVelocity.toBN(),
        makerFee: m.feeRates.makerFeeOffchainDelayedOrder.toBN(),
        takerFee: m.feeRates.takerFeeOffchainDelayedOrder.toBN(),
        maxLeverage: m.contractMaxLeverage.toBN(),
        protocolName: this.protocolIdentifier,
      };

      extendedMarkets.push(extendedMarket);
    });

    // for (let i = 0; i < extendedMarkets.length; i++) {
    //   let m = extendedMarkets[i];
    //   m.price = (await this.sdk.futures.getAssetPrice(m.address!)).toBN();
    // }

    return extendedMarkets;
  }

  async getMarketPrice(market: Market): Promise<BigNumber> {
    const targetMarket = await this.findMarketByKey(market.indexOrIdentifier);
    if (!targetMarket) {
      throw new Error("Market not found");
    }

    return (await this.sdk.futures.getAssetPrice(targetMarket.market)).toBN();
  }

  async createOrder(
    signer: Signer,
    market: {
      mode: Mode;
      longCollateral: Token[];
      shortCollateral: Token[];
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
  ): Promise<UnsignedTransaction[]> {
    const targetMarket = await this.findMarketByKey(market.indexOrIdentifier);
    if (!targetMarket) {
      throw new Error("Market not found");
    }

    await this.sdk.setSigner(signer);

    let txs: UnsignedTransaction[] = [];

    // For Market Decrease: Array of [create Order TX]
    if (order.type == "MARKET_DECREASE") {
      // proper orders
      let sizeDelta = wei(order.sizeDelta).neg();

      txs.push(
        (await this.sdk.futures.submitIsolatedMarginOrder(
          targetMarket.market,
          sizeDelta,
          wei(order.trigger?.triggerPrice)
        )) as UnsignedTransaction
      );
    } else if (order.type == "MARKET_INCREASE") {
      // For Market Increase: Array of [withdrawUnusedCollateralTx's + Deposit Tx + create Order Tx]

      // withdraw unused collateral tx's
      const idleMargins = await this.sdk.futures.getIdleMarginInMarkets(
        this.swAddr
      );
      if (idleMargins.totalIdleInMarkets.gt(0)) {
        let idleMarkets = idleMargins.marketsWithIdleMargin;

        for (let i = 0; i < idleMarkets.length; i++) {
          let withdrawAmount = idleMarkets[i].position!.remainingMargin.neg();
          let withdrawTx = (await this.sdk.futures.depositIsolatedMargin(
            idleMarkets[i].marketAddress,
            withdrawAmount
          )) as UnsignedTransaction;
          // logObject("withdrawTx", withdrawTx);

          txs.push(withdrawTx);
        }
      }

      // deposit tx
      let depositAmount = wei(order.inputCollateralAmount);
      let depositTx = (await this.sdk.futures.depositIsolatedMargin(
        targetMarket.market!,
        depositAmount
      )) as UnsignedTransaction;
      // logObject("depositTx", depositTx);
      txs.push(depositTx);

      // create order tx
      let sizeDelta = wei(order.sizeDelta);
      let createOrderTx = (await this.sdk.futures.submitIsolatedMarginOrder(
        targetMarket.market,
        sizeDelta,
        wei(order.trigger?.triggerPrice)
      )) as UnsignedTransaction;
      // logObject("createOrderTx", createOrderTx);
      txs.push(createOrderTx);
    } else {
      throw new Error("Invalid order type");
    }

    return txs;
  }

  updateOrder(
    signer: Signer,
    market: {
      mode: Mode;
      longCollateral: [];
      shortCollateral: [];
      indexOrIdentifier: string;
      supportedOrderTypes: Record<OrderType, Boolean>;
    },
    updatedOrder: Partial<ExtendedOrder>
  ): Promise<UnsignedTransaction[]> {
    throw new Error("Method not Supported.");
  }

  async cancelOrder(
    signer: Signer,
    market: {
      mode: Mode;
      longCollateral: [];
      shortCollateral: [];
      indexOrIdentifier: string;
      supportedOrderTypes: Record<OrderType, Boolean>;
    },
    order: Partial<ExtendedOrder>
  ): Promise<UnsignedTransaction[]> {
    const targetMarket = await this.findMarketByKey(market.indexOrIdentifier);
    if (!targetMarket) {
      throw new Error("Market not found");
    }

    return [
      await this.sdk.futures.cancelDelayedOrder(
        targetMarket.market,
        await signer.getAddress(),
        true
      ),
    ];
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

  async getPosition(
    positionIdentifier: Position["indexOrIdentifier"], // serves as market identifier for SNX
    user?: string
  ): Promise<ExtendedPosition> {
    let extendedPosition: ExtendedPosition = {} as ExtendedPosition;

    let targetMarket = await this.findMarketByKey(positionIdentifier);
    if (!targetMarket) {
      throw new Error("Market not found");
    }

    let futureMarkets = [];
    futureMarkets.push({
      // asset: FuturesMarketAsset[supportedMarkets[i].asset!],
      asset: targetMarket.asset,
      marketKey: targetMarket.marketKey,
      address: targetMarket.market,
    });

    let futurePositions = await this.sdk.futures.getFuturesPositions(
      user!,
      futureMarkets
    );

    if (futurePositions.length != 0) {
      return this.mapFuturePositionToExtendedPosition(futurePositions[0]);
    }

    return extendedPosition;
  }

  async getAllPositions(
    user: string,
    signer: Signer
  ): Promise<ExtendedPosition[]> {
    let extendedPositions: ExtendedPosition[] = [];

    let supportedMarkets = await this.supportedMarkets(
      this.supportedNetworks()[0]
    );

    let futureMarkets = [];

    for (let i = 0; i < supportedMarkets.length; i++) {
      futureMarkets.push({
        // asset: FuturesMarketAsset[supportedMarkets[i].asset!],
        asset: getEnumEntryByValue(
          FuturesMarketAsset,
          supportedMarkets[i].asset!
        )!,
        marketKey: getEnumEntryByValue(
          FuturesMarketKey,
          supportedMarkets[i].indexOrIdentifier!
        )!,
        address: supportedMarkets[i].address!,
      });
    }

    let futurePositions = await this.sdk.futures.getFuturesPositions(
      user,
      futureMarkets
    );
    // console.log("Future positions: ", futurePositions.length);
    // futurePositions.forEach((p) => {
    //   logObject("Future position: ", p);
    //   if (p.position) logObject("Inside Position: ", p.position);
    // });

    for (let i = 0; i < futurePositions.length; i++) {
      if (futurePositions[i].position == null) continue;

      extendedPositions.push(
        this.mapFuturePositionToExtendedPosition(futurePositions[i])
      );
    }
    // console.log("Extended positions: ", extendedPositions.length);
    // extendedPositions.forEach((p) => {
    //   logObject("Extended position: ", p);
    // });

    return extendedPositions;
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

  async getAvailableSusdBalance(user: string): Promise<BigNumber> {
    const result = await this.sdk.futures.getIdleMarginInMarkets(user);
    return result.totalIdleInMarkets.toBN();
  }

  //// HELPERS ////

  mapFuturePositionToExtendedPosition(
    futurePosition: FuturesPosition
  ): ExtendedPosition {
    return {
      indexOrIdentifier: futurePosition.marketKey.toString(),
      size: futurePosition.position!.size.toBN(),
      collateral: futurePosition.position!.initialMargin.toBN(),
      averageEntryPrice: futurePosition.position!.lastPrice.toBN(),
      cumulativeFunding: futurePosition.position!.accruedFunding.toBN(),
      unrealizedPnl: futurePosition.position!.pnl.toBN(),
      liqudationPrice: futurePosition.position!.liquidationPrice.toBN(),
      leverage: futurePosition.position!.initialLeverage.toBN(),
    };
  }
}
