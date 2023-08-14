import KwentaSDK from "@kwenta/sdk";
import { Signer, BigNumber, UnsignedTransaction, BigNumberish } from "ethers";
import {
  ExtendedPosition,
  IExchange,
  Market,
  Order,
  OrderAction,
  Token,
  MarketIdentifier,
  CollateralData,
  Position,
  OrderIdentifier,
  ExtendedOrder,
  ExtendedMarket,
  DynamicMarketMetadata,
  OpenMarkets,
} from "../interface";
import Wei, { wei } from "@synthetixio/wei";
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
import { getEnumEntryByValue, logObject } from "../common/helper";

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

  async getMarketAddress(market: ExtendedMarket): Promise<string> {
    let marketAddress = market.address;
    if (!marketAddress) {
      const targetMarket = await this.findMarketByKey(market.indexOrIdentifier);
      if (!targetMarket) {
        throw new Error("Market not found");
      }
      marketAddress = targetMarket.market;
    }
    return marketAddress;
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
  }): Promise<ExtendedMarket[]> {
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
        maxLeverage: m.contractMaxLeverage.toBN(),
        protocolName: this.protocolIdentifier,
      };

      extendedMarkets.push(extendedMarket);
    });

    return extendedMarkets;
  }

  async getDynamicMetadata(
    market: ExtendedMarket
  ): Promise<DynamicMarketMetadata> {
    throw new Error("Method not Supported.");

    // oiLong: m.openInterest.long.toBN(),
    //     oiShort: m.openInterest.short.toBN(),
    //     fundingRate: m.currentFundingRate.toBN(),
    //     fundingVelocity: m.currentFundingVelocity.toBN(),
    //     makerFee: m.feeRates.makerFeeOffchainDelayedOrder.toBN(),
    //     takerFee: m.feeRates.takerFeeOffchainDelayedOrder.toBN(),
  }

  async getMarketPrice(market: ExtendedMarket): Promise<BigNumber> {
    return (
      await this.sdk.futures.getAssetPrice(await this.getMarketAddress(market))
    ).toBN();
  }

  async createOrder(
    signer: Signer,
    market: ExtendedMarket,
    order: Order
  ): Promise<UnsignedTransaction[]> {
    const marketAddress = await this.getMarketAddress(market);

    await this.sdk.setSigner(signer);

    let txs: UnsignedTransaction[] = [];

    // withdraw unused collateral tx's
    txs.push(...(await this.withdrawUnusedCollateral(this.swAddr, signer)));

    if (order.inputCollateralAmount.gt(0)) {
      // deposit tx
      let depositAmount = wei(order.inputCollateralAmount);
      let depositTx = (await this.sdk.futures.depositIsolatedMargin(
        marketAddress,
        depositAmount
      )) as UnsignedTransaction;
      // logObject("depositTx", depositTx);
      txs.push(depositTx);
    }

    if (order.type == "MARKET_DECREASE" || order.type == "MARKET_INCREASE") {
      // proper orders
      let sizeDelta =
        order.type == "MARKET_DECREASE"
          ? wei(order.sizeDelta).neg()
          : wei(order.sizeDelta);

      txs.push(
        (await this.sdk.futures.submitIsolatedMarginOrder(
          marketAddress,
          sizeDelta,
          wei(order.trigger?.triggerPrice)
        )) as UnsignedTransaction
      );
    } else {
      throw new Error("Invalid order type");
    }

    return txs;
  }

  updateOrder(
    signer: Signer,
    market: Market,
    updatedOrder: Partial<ExtendedOrder>
  ): Promise<UnsignedTransaction[]> {
    throw new Error("Method not Supported.");
  }

  async cancelOrder(
    signer: Signer,
    market: ExtendedMarket,
    order: Partial<ExtendedOrder>
  ): Promise<UnsignedTransaction[]> {
    const marketAddress = await this.getMarketAddress(market);

    return [
      await this.sdk.futures.cancelDelayedOrder(
        marketAddress,
        await signer.getAddress(),
        true
      ),
    ];
  }

  async closePosition(
    signer: Signer,
    position: ExtendedPosition
  ): Promise<UnsignedTransaction[]> {
    let fillPrice = await this.getFillPriceInternal(
      position.indexOrIdentifier,
      position.direction == "LONG"
        ? wei(position.size).neg()
        : wei(position.size)
    );

    fillPrice =
      position.direction == "LONG"
        ? fillPrice.mul(99).div(100)
        : fillPrice.mul(101).div(100);

    return this.createOrder(
      signer,
      {
        mode: "ASYNC",
        longCollateral: [this.token],
        shortCollateral: [this.token],
        indexOrIdentifier: position.indexOrIdentifier,
        supportedOrderTypes: {
          LIMIT_DECREASE: false,
          LIMIT_INCREASE: false,
          MARKET_INCREASE: true,
          MARKET_DECREASE: true,
          DEPOSIT: true,
          WITHDRAW: true,
        },
      },
      {
        type:
          position.direction == "LONG" ? "MARKET_DECREASE" : "MARKET_INCREASE",
        direction: position.direction == "LONG" ? "SHORT" : "LONG",
        inputCollateral: {
          name: "string",
          symbol: "string",
          decimals: "string",
          address: "string",
        },
        inputCollateralAmount: BigNumber.from(0),
        sizeDelta: position.size,
        isTriggerOrder: false,
        referralCode: undefined,
        trigger: {
          triggerPrice: fillPrice,
          triggerAboveThreshold: true,
        },
      }
    );
  }

  async getFillPrice(market: Market, order: Order): Promise<BigNumber> {
    const marketAddress = await this.getMarketAddress(market);

    return this.getFillPriceInternal(marketAddress, wei(order.sizeDelta));
  }

  async getFillPriceInternal(marketAddress: string, sizeDelta: Wei) {
    let fillPrice = await this.sdk.futures.getFillPrice(
      marketAddress,
      sizeDelta
    );

    return fillPrice.price;
  }

  async getTradePreview(
    user: string,
    signer: Signer,
    market: ExtendedMarket,
    order: Order
  ): Promise<ExtendedPosition> {
    const marketAddress = await this.getMarketAddress(market);

    await this.sdk.setSigner(signer);

    if (order.type == "MARKET_INCREASE" || order.type == "MARKET_DECREASE") {
      let sizeDelta = wei(order.sizeDelta);
      sizeDelta = order.type == "MARKET_INCREASE" ? sizeDelta : sizeDelta.neg();

      const tradePreview =
        await this.sdk.futures.getSimulatedIsolatedTradePreview(
          user,
          getEnumEntryByValue(FuturesMarketKey, market.indexOrIdentifier!)!,
          marketAddress,
          {
            sizeDelta: sizeDelta,
            marginDelta: wei(order.inputCollateralAmount),
            orderPrice: wei(order.trigger!.triggerPrice),
          }
        );

      return {
        indexOrIdentifier: "",
        size: tradePreview.size,
        collateral: tradePreview.margin,
        averageEntryPrice: tradePreview.price,
        liqudationPrice: tradePreview.liqPrice,
        otherFees: tradePreview.fee,
        status: tradePreview.status,
        fee: tradePreview.fee,
      };
    }

    throw new Error("Invalid order type");
  }

  async getOrder(
    user: string,
    orderIdentifier: OrderIdentifier, // serves as market identifier for SNX
    market: ExtendedMarket
  ): Promise<ExtendedOrder> {
    const marketAddress = await this.getMarketAddress(market);

    const orderData = await this.sdk.futures.getDelayedOrder(
      user,
      marketAddress
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

  async getAllOrders(
    user: string,
    openMarkets?: OpenMarkets
  ): Promise<Array<ExtendedOrder>> {
    let markets = await this.getExtendedMarketsFromOpenMarkets(openMarkets);

    let ordersData: ExtendedOrder[] = [];
    markets.forEach(async (m) => {
      let orderData = await this.getOrder(user, m.indexOrIdentifier, m);
      if (orderData.orderIdentifier) {
        ordersData.push(orderData);
      }
    });

    return ordersData;
  }

  // will work as getOrder for SNX
  async getMarketOrders(
    user: string,
    market: ExtendedMarket
  ): Promise<Array<ExtendedOrder>> {
    let ordersData: ExtendedOrder[] = [];

    ordersData.push(
      await this.getOrder(user, market.indexOrIdentifier, market)
    );

    return ordersData;
  }

  async getPosition(
    positionIdentifier: Position["indexOrIdentifier"], // serves as market identifier for SNX
    market: ExtendedMarket,
    user?: string
  ): Promise<ExtendedPosition> {
    let extendedPosition: ExtendedPosition = {} as ExtendedPosition;

    let futureMarkets = [];
    futureMarkets.push({
      asset: getEnumEntryByValue(FuturesMarketAsset, market.asset!)!,
      marketKey: getEnumEntryByValue(
        FuturesMarketKey,
        market.indexOrIdentifier!
      )!,
      address: await this.getMarketAddress(market),
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
    signer: Signer,
    openMarkets?: OpenMarkets
  ): Promise<ExtendedPosition[]> {
    let extendedPositions: ExtendedPosition[] = [];

    let markets = await this.getExtendedMarketsFromOpenMarkets(openMarkets);

    let futureMarkets = [];

    for (let i = 0; i < markets.length; i++) {
      futureMarkets.push({
        asset: getEnumEntryByValue(FuturesMarketAsset, markets[i].asset!)!,
        marketKey: getEnumEntryByValue(
          FuturesMarketKey,
          markets[i].indexOrIdentifier!
        )!,
        address: markets[i].address!,
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

  async withdrawUnusedCollateral(
    user: string,
    signer: Signer
  ): Promise<UnsignedTransaction[]> {
    let txs: UnsignedTransaction[] = [];

    await this.sdk.setSigner(signer);

    // withdraw unused collateral tx's
    const idleMargins = await this.sdk.futures.getIdleMarginInMarkets(user);

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

    return txs;
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
      direction:
        futurePosition.position!.side == PositionSide.LONG ? "LONG" : "SHORT",
    };
  }

  mapOpenMarketsToExtendedMarkets(openMarkets: OpenMarkets): ExtendedMarket[] {
    let extendedMarkets: ExtendedMarket[] = [];
    Object.keys(openMarkets).forEach((key) => {
      openMarkets[key]
        .filter((m) => m.protocolName == this.protocolIdentifier)
        .forEach((m) => {
          extendedMarkets.push(m);
        });
    });
    return extendedMarkets;
  }

  async getExtendedMarketsFromOpenMarkets(
    openMarkets?: OpenMarkets
  ): Promise<ExtendedMarket[]> {
    let supportedMarkets: ExtendedMarket[] = [];
    if (openMarkets) {
      supportedMarkets = this.mapOpenMarketsToExtendedMarkets(openMarkets);
    } else {
      supportedMarkets = await this.supportedMarkets(
        this.supportedNetworks()[0]
      );
    }
    return supportedMarkets;
  }
}
