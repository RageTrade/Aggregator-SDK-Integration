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
  OpenMarketData,
  Trade,
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
import {
  getEnumEntryByValue,
  logObject,
  toNumberDecimal,
} from "../common/helper";
import { getExplorerUrl } from "../configs/gmx/chains";

export default class SynthetixV2Service implements IExchange {
  private opChainId = 10;
  private sdk: KwentaSDK;
  private sUSDAddr = "0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9";
  private sUsd: Token = {
    name: "Synthetix USD",
    symbol: "sUSD",
    decimals: "18",
    address: this.sUSDAddr,
  };
  private swAddr: string;
  private protocolIdentifier = "synthetixV2";
  private decimals = 18;
  private explorerUrl = getExplorerUrl(this.opChainId);

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
    const markets = await this.sdk.futures.getProxiedMarkets();

    let extendedMarkets: ExtendedMarket[] = [];

    markets.forEach((m) => {
      let extendedMarket: ExtendedMarket = {
        mode: "ASYNC",
        longCollateral: [this.sUsd],
        shortCollateral: [this.sUsd],
        indexOrIdentifier: m.marketKey!,
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
        maxLeverage: toNumberDecimal(
          m.contractMaxLeverage!.toBN(),
          this.decimals
        ),
        minInitialMargin: toNumberDecimal(
          m.minInitialMargin!.toBN(),
          this.decimals
        ),
        protocolName: this.protocolIdentifier,
      };

      extendedMarkets.push(extendedMarket);
    });

    return extendedMarkets;
  }

  async getDynamicMetadata(
    market: ExtendedMarket
  ): Promise<DynamicMarketMetadata> {
    const futureMarket = await this.sdk.futures.getMarketMetadata(
      market.address!
    );

    return {
      oiLong: futureMarket.openInterest.long.toBN(),
      oiShort: futureMarket.openInterest.short.toBN(),
      fundingRate: futureMarket.currentFundingRate.toBN(),
      fundingVelocity: futureMarket.currentFundingVelocity.toBN(),
      makerFee: futureMarket.feeRates.makerFeeOffchainDelayedOrder.toBN(),
      takerFee: futureMarket.feeRates.takerFeeOffchainDelayedOrder.toBN(),
      availableLiquidityLongUSD: futureMarket.marketLimitUsd
        .sub(futureMarket.openInterest.longUSD)
        .toBN(),
      availableLiquidityShortUSD: futureMarket.marketLimitUsd
        .sub(futureMarket.openInterest.shortUSD)
        .toBN(),
      oiLongUsd: futureMarket.openInterest.longUSD.toBN(),
      oiShortUsd: futureMarket.openInterest.shortUSD.toBN(),
      marketLimitUsd: futureMarket.marketLimitUsd.toBN(),
      marketLimitNative: futureMarket.marketLimitNative.toBN(),
    };
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
    let txs: UnsignedTransaction[] = [];
    if (order.sizeDelta.eq(0)) return txs;

    const marketAddress = await this.getMarketAddress(market);
    await this.sdk.setSigner(signer);

    if (order.inputCollateralAmount.gt(0)) {
      // withdraw unused collateral tx's
      txs.push(...(await this.withdrawUnusedCollateral(this.swAddr, signer)));

      // deposit
      let depositTx = await this.formulateDepositTx(
        marketAddress,
        wei(order.inputCollateralAmount)
      );
      // logObject("depositTx", depositTx);
      txs.push(depositTx);
    }

    // proper orders
    let sizeDelta =
      order.direction == "SHORT"
        ? wei(order.sizeDelta).neg()
        : wei(order.sizeDelta);

    txs.push(
      (await this.sdk.futures.submitIsolatedMarginOrder(
        marketAddress,
        sizeDelta,
        wei(order.trigger?.triggerPrice)
      )) as UnsignedTransaction
    );

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
    position: ExtendedPosition,
    closeSize: BigNumber
  ): Promise<UnsignedTransaction[]> {
    if (closeSize.eq(0) || closeSize.gt(position.size)) {
      throw new Error("Invalid close size");
    }

    let fillPrice = await this.getFillPriceInternal(
      position.marketAddress!,
      position.direction == "LONG" ? wei(closeSize).neg() : wei(closeSize)
    );

    fillPrice =
      position.direction == "LONG"
        ? fillPrice.mul(99).div(100)
        : fillPrice.mul(101).div(100);

    return this.createOrder(
      signer,
      {
        mode: "ASYNC",
        longCollateral: [this.sUsd],
        shortCollateral: [this.sUsd],
        indexOrIdentifier: position.indexOrIdentifier,
        address: position.marketAddress,
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
        type: "MARKET_DECREASE",
        direction: position.direction == "LONG" ? "SHORT" : "LONG",
        inputCollateral: {
          name: "string",
          symbol: "string",
          decimals: "string",
          address: "string",
        },
        inputCollateralAmount: BigNumber.from(0),
        sizeDelta: closeSize,
        isTriggerOrder: false,
        referralCode: undefined,
        trigger: {
          triggerPrice: fillPrice,
          triggerAboveThreshold: true,
        },
      }
    );
  }

  async updatePositionMargin(
    signer: Signer,
    position: ExtendedPosition,
    marginAmount: BigNumber,
    isDeposit: boolean
  ): Promise<UnsignedTransaction[]> {
    let txs: UnsignedTransaction[] = [];

    // validation
    if (
      marginAmount.eq(0) ||
      (!isDeposit && marginAmount.gt(position.accessibleMargin!))
    ) {
      throw new Error("Invalid collateral delta");
    }

    if (isDeposit) {
      // withdraw unused collateral tx's
      txs.push(...(await this.withdrawUnusedCollateral(this.swAddr, signer)));

      // deposit
      let depositTx = await this.formulateDepositTx(
        position.marketAddress!,
        wei(marginAmount)
      );
      txs.push(depositTx);
    } else {
      await this.sdk.setSigner(signer);

      // no need to withdraw from 0-positioned markets
      // withdraw from the position
      let withdrawTx = await this.formulateWithdrawTx(
        position.marketAddress!,
        wei(marginAmount)
      );
      txs.push(withdrawTx);
    }

    return txs;
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

    let sizeDelta = wei(order.sizeDelta);
    sizeDelta = order.direction == "LONG" ? sizeDelta : sizeDelta.neg();

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
      type: orderData.size.gt(0) ? "MARKET_INCREASE" : "MARKET_DECREASE",
      direction: orderData.side == PositionSide.LONG ? "LONG" : "SHORT",
      sizeDelta: orderData.size.abs().toBN(),
      isTriggerOrder: false,
      referralCode: undefined,
      trigger: {
        triggerPrice: orderData.desiredFillPrice.toBN(),
        triggerAboveThreshold: true,
      },
      inputCollateral: this.sUsd,
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
    openMarkets: OpenMarkets | undefined
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
    market: OpenMarketData,
    user: string | undefined
  ): Promise<ExtendedPosition> {
    let extendedPosition: ExtendedPosition = {} as ExtendedPosition;
    let marketAddress = await this.getMarketAddress(market);

    let futureMarkets = [];
    futureMarkets.push({
      asset: getEnumEntryByValue(FuturesMarketAsset, market.asset!)!,
      marketKey: getEnumEntryByValue(
        FuturesMarketKey,
        market.indexOrIdentifier!
      )!,
      address: marketAddress,
    });

    let futurePositions = await this.sdk.futures.getFuturesPositions(
      user!,
      futureMarkets
    );

    if (futurePositions.length != 0) {
      extendedPosition = this.mapFuturePositionToExtendedPosition(
        futurePositions[0],
        marketAddress
      );
    }

    return extendedPosition;
  }

  async getAllPositions(
    user: string,
    signer: Signer,
    openMarkets: OpenMarkets | undefined
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
        this.mapFuturePositionToExtendedPosition(
          futurePositions[i],
          markets.find(
            (m) =>
              m.indexOrIdentifier == futurePositions[i].marketKey.toString()
          )!.address!
        )
      );
    }
    // console.log("Extended positions: ", extendedPositions.length);
    // extendedPositions.forEach((p) => {
    //   logObject("Extended position: ", p);
    // });

    return extendedPositions;
  }

  async getTradesHistory(
    user: string,
    openMarkers: OpenMarkets | undefined
  ): Promise<Trade[]> {
    let trades: Trade[] = [];
    let markets = await this.getExtendedMarketsFromOpenMarkets(openMarkers);

    let tradesHistory = await this.sdk.futures.getAllTrades(
      user,
      "isolated_margin",
      1000
    );

    tradesHistory.forEach((t) => {
      let market = markets.find((m) => m.asset == t.asset.toString())!;
      trades.push({
        indexOrIdentifier: market.indexOrIdentifier,
        size: t.size.toBN(),
        collateral: t.margin.toBN(),
        averageEntryPrice: t.price.toBN(),
        lastUpdatedAtTimestamp: t.timestamp,
        pnl: t.pnl.toBN(),
        fee: t.feesPaid.add(t.keeperFeesPaid).toBN(),
        direction: t.side == PositionSide.LONG ? "LONG" : "SHORT",
        marketAddress: market.address!,
        positionClosed: t.positionClosed,
        keeperFeesPaid: t.keeperFeesPaid.toBN(),
        txHash: t.txnHash,
        txLink: this.explorerUrl + "tx/" + t.txnHash,
      });
    });

    return trades;
  }

  async getIdleMargins(
    user: string
  ): Promise<(MarketIdentifier & CollateralData)[]> {
    const result = await this.sdk.futures.getIdleMarginInMarkets(user);

    return result.marketsWithIdleMargin.map((m) => ({
      indexOrIdentifier: FuturesMarketKey[m.marketKey].toString(),
      inputCollateral: this.sUsd,
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
        let withdrawTx = await this.formulateWithdrawTx(
          idleMarkets[i].marketAddress,
          idleMarkets[i].position!.remainingMargin
        );
        // logObject("withdrawTx", withdrawTx);

        txs.push(withdrawTx);
      }
    }

    return txs;
  }

  //// HELPERS ////

  mapFuturePositionToExtendedPosition(
    futurePosition: FuturesPosition,
    marketAddress: string
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
      accessibleMargin: futurePosition.accessibleMargin.toBN(),
      marketAddress: marketAddress,
    };
  }

  mapOpenMarketsToExtendedMarkets(openMarkets: OpenMarkets): ExtendedMarket[] {
    let extendedMarkets: ExtendedMarket[] = [];
    Object.keys(openMarkets).forEach((key) => {
      openMarkets[key]
        .filter(
          (m) => m.protocolName && m.protocolName == this.protocolIdentifier
        )
        .forEach((m) => {
          extendedMarkets.push(m);
        });
    });
    return extendedMarkets;
  }

  async getExtendedMarketsFromOpenMarkets(
    openMarkets: OpenMarkets | undefined
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

  async formulateWithdrawTx(marketAddress: string, withdrawAmount: Wei) {
    return (await this.sdk.futures.withdrawIsolatedMargin(
      marketAddress,
      withdrawAmount
    )) as UnsignedTransaction;
  }

  async formulateDepositTx(marketAddress: string, depositAmount: Wei) {
    return (await this.sdk.futures.depositIsolatedMargin(
      marketAddress,
      depositAmount
    )) as UnsignedTransaction;
  }
}
