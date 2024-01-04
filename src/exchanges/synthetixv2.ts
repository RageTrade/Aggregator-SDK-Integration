import KwentaSDK from '@kwenta/sdk'
import { BigNumber, UnsignedTransaction, BigNumberish } from 'ethers'
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
  TradeHistory,
  HistoricalOrderType,
  NumberDecimal,
  PROTOCOL_NAME,
  Provider,
  UnsignedTxWithMetadata,
  LiquidationHistory,
  PageOptions,
  PaginatedRes
} from '../interface'
import Wei, { wei } from '@synthetixio/wei'
import { ContractOrderType, FuturesMarket, FuturesMarketKey, PositionSide } from '@kwenta/sdk/dist/types'
import { FuturesMarketAsset, FuturesPosition, PotentialTradeStatus } from '@kwenta/sdk/dist/types/futures'
import {
  formatN,
  getEnumEntryByValue,
  logObject,
  toNumberDecimal,
  applySlippage,
  getPaginatedResponse
} from '../common/helper'
import { getExplorerUrl } from '../configs/gmx/chains'
import { timer } from 'execution-time-decorators'
import { formatUnits, parseUnits } from 'ethers/lib/utils'
import { getTokenPrice, getTokenPriceD } from '../configs/pyth/prices'
import { ApiOpts } from '../interfaces/V1/IRouterAdapterBaseV1'
import { CACHE_DAY, CACHE_MINUTE, CACHE_TIME_MULT, SYNV2_CACHE_PREFIX, cacheFetch, getStaleTime } from '../common/cache'
import { rpc } from '../common/provider'

export default class SynthetixV2Service implements IExchange {
  private opChainId = 10
  private sdk: KwentaSDK = new KwentaSDK({
    networkId: 10,
    provider: rpc[10]
  })
  private sUSDAddr = '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9'
  private sUsd: Token = {
    name: 'Synthetix USD',
    symbol: 'sUSD',
    decimals: '18',
    address: this.sUSDAddr
  }
  private protocolIdentifier: PROTOCOL_NAME = 'SYNTHETIX_V2'
  private decimals = 18

  async getMarketAddress(market: ExtendedMarket): Promise<string> {
    let marketAddress = market.address
    if (!marketAddress) {
      const targetMarket = await this.findMarketByKey(market.indexOrIdentifier)
      if (!targetMarket) {
        throw new Error('Market not found')
      }
      marketAddress = targetMarket.market
    }
    return marketAddress
  }

  async findMarketByKey(marketKey: string): Promise<FuturesMarket | undefined> {
    // find the market
    const markets = await this.sdk.futures.getMarkets()
    return markets.find((m) => m.marketKey == marketKey)
  }

  setup(provider: Provider): Promise<UnsignedTxWithMetadata[]> {
    return Promise.resolve([])
  }

  supportedNetworks(): readonly { name: string; chainId: number }[] {
    return [
      {
        name: 'optimism',
        chainId: this.opChainId
      }
    ]
  }

  async supportedMarkets(network: { name: string; chainId: number }): Promise<ExtendedMarket[]> {
    const markets = (await this.sdk.futures.getProxiedMarkets()).filter((m) => !m.isSuspended)

    let extendedMarkets: ExtendedMarket[] = []

    markets.forEach((m) => {
      let extendedMarket: ExtendedMarket = {
        mode: 'ASYNC',
        longCollateral: [this.sUsd],
        shortCollateral: [this.sUsd],
        indexOrIdentifier: m.marketKey!,
        supportedOrderTypes: {
          LIMIT_INCREASE: false,
          LIMIT_DECREASE: false,
          MARKET_INCREASE: true,
          MARKET_DECREASE: true,
          DEPOSIT: false,
          WITHDRAW: false
        },
        supportedOrderActions: {
          CREATE: true,
          UPDATE: false,
          CANCEL: true
        },
        asset: m.asset,
        address: m.market,
        maxLeverage: toNumberDecimal(m.contractMaxLeverage!.toBN(), this.decimals),
        minInitialMargin: toNumberDecimal(parseUnits('50', 18), this.decimals),
        protocolName: this.protocolIdentifier,
        minPositionSize: toNumberDecimal(BigNumber.from(0), this.decimals),
        minLeverage: toNumberDecimal(BigNumber.from(1), this.decimals)
      }

      extendedMarkets.push(extendedMarket)
    })

    return extendedMarkets
  }

  async getDynamicMetadata(market: ExtendedMarket): Promise<DynamicMarketMetadata> {
    const futureMarket = await this.sdk.futures.getMarketMetadata(market.address!)

    return {
      oiLong: futureMarket.openInterest.long.toBN(),
      oiShort: futureMarket.openInterest.short.toBN(),
      fundingRate: futureMarket.currentFundingRate.toBN(),
      fundingVelocity: futureMarket.currentFundingVelocity.toBN(),
      makerFee: futureMarket.feeRates.makerFeeOffchainDelayedOrder.toBN(),
      takerFee: futureMarket.feeRates.takerFeeOffchainDelayedOrder.toBN(),
      availableLiquidityLongUSD: futureMarket.marketLimitUsd.sub(futureMarket.openInterest.longUSD).toBN(),
      availableLiquidityShortUSD: futureMarket.marketLimitUsd.sub(futureMarket.openInterest.shortUSD).toBN(),
      oiLongUsd: futureMarket.openInterest.longUSD.toBN(),
      oiShortUsd: futureMarket.openInterest.shortUSD.toBN(),
      marketLimitUsd: futureMarket.marketLimitUsd.toBN(),
      marketLimitNative: futureMarket.marketLimitNative.toBN()
    }
  }

  async getMarketPrice(market: ExtendedMarket) {
    const v = getTokenPriceD(market.asset!, 18)
    if (!v) return null

    return {
      value: v.toString(),
      decimals: 18
    }
  }

  async getMarketPriceByAddress(marketAddress: string): Promise<NumberDecimal> {
    return {
      value: (await this.sdk.futures.getAssetPrice(marketAddress)).toBN().toString(),
      decimals: 18
    }
  }

  getMarketPriceByIdentifier(marketIdentifier: string) {
    const asset = marketIdentifier.slice(1, marketIdentifier.length - 4)

    const v = getTokenPriceD(asset, 18)
    if (!v) return null

    return {
      value: v.toString(),
      decimals: 18
    }
  }

  async createOrder(
    provider: Provider,
    market: ExtendedMarket,
    order: Order,
    wallet: string
  ): Promise<UnsignedTxWithMetadata[]> {
    let txs: UnsignedTxWithMetadata[] = []
    if (order.sizeDelta.eq(0)) return txs

    const marketAddress = await this.getMarketAddress(market)
    await this.sdk.setProvider(provider)

    if (order.inputCollateralAmount.gt(0)) {
      // withdraw unused collateral tx's
      txs.push(...(await this.withdrawUnusedCollateral(wallet, provider)))

      // deposit
      let depositTx = await this.formulateDepositTx(marketAddress, wei(order.inputCollateralAmount))
      // logObject("depositTx", depositTx);
      txs.push(depositTx)
    }

    // proper orders
    let sizeDelta = order.direction == 'SHORT' ? wei(order.sizeDelta).neg() : wei(order.sizeDelta)

    const acceptablePrice =
      order.slippage && order.slippage != ''
        ? applySlippage(order.trigger?.triggerPrice!, Number(order.slippage), order.direction == 'LONG')
        : order.trigger?.triggerPrice!

    txs.push({
      tx: (await this.sdk.futures.submitIsolatedMarginOrder(
        marketAddress,
        sizeDelta,
        wei(acceptablePrice)
      )) as UnsignedTransaction,
      type: 'SNX_V2',
      data: undefined,
      heading: 'Create Order',
      desc: 'Create Order'
    })

    return txs
  }

  updateOrder(
    provider: Provider,
    market: Market | undefined,
    updatedOrder: Partial<ExtendedOrder>,
    wallet: string
  ): Promise<UnsignedTxWithMetadata[]> {
    throw new Error('Method not Supported.')
  }

  async cancelOrder(
    provider: Provider,
    market: ExtendedMarket,
    order: Partial<ExtendedOrder>,
    wallet: string
  ): Promise<UnsignedTxWithMetadata[]> {
    const marketAddress = await this.getMarketAddress(market)

    return [
      {
        tx: await this.sdk.futures.cancelDelayedOrder(marketAddress, wallet, true),
        type: 'SNX_V2',
        data: undefined,
        heading: 'Cancel Order',
        desc: 'Cancel Order'
      }
    ]
  }

  async closePosition(
    provider: Provider,
    position: ExtendedPosition,
    closeSize: BigNumber,
    isTrigger: boolean,
    triggerPrice: BigNumber | undefined,
    triggerAboveThreshold: boolean | undefined,
    outputToken: Token | undefined,
    wallet: string
  ): Promise<UnsignedTxWithMetadata[]> {
    if (closeSize.eq(0) || closeSize.gt(position.size)) {
      throw new Error('Invalid close size')
    }

    let fillPrice = await this.getFillPriceInternal(
      position.marketAddress!,
      position.direction == 'LONG' ? wei(closeSize).neg() : wei(closeSize)
    )

    fillPrice = position.direction == 'LONG' ? fillPrice.mul(99).div(100) : fillPrice.mul(101).div(100)

    return this.createOrder(
      provider,
      {
        mode: 'ASYNC',
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
          WITHDRAW: true
        },
        protocolName: this.protocolIdentifier
      },
      {
        type: 'MARKET_DECREASE',
        direction: position.direction == 'LONG' ? 'SHORT' : 'LONG',
        inputCollateral: {
          name: 'string',
          symbol: 'string',
          decimals: 'string',
          address: 'string'
        },
        inputCollateralAmount: BigNumber.from(0),
        sizeDelta: closeSize,
        isTriggerOrder: false,
        referralCode: undefined,
        trigger: {
          triggerPrice: fillPrice,
          triggerAboveThreshold: true
        },
        slippage: '1'
      },
      wallet
    )
  }

  async updatePositionMargin(
    provider: Provider,
    position: ExtendedPosition,
    marginAmount: BigNumber,
    isDeposit: boolean,
    transferToken: Token | undefined,
    wallet: string
  ): Promise<UnsignedTxWithMetadata[]> {
    let txs: UnsignedTxWithMetadata[] = []

    // validation
    if (marginAmount.eq(0) || (!isDeposit && marginAmount.gt(position.accessibleMargin!))) {
      throw new Error('Invalid collateral delta')
    }

    if (isDeposit) {
      // withdraw unused collateral tx's
      txs.push(...(await this.withdrawUnusedCollateral(wallet, provider)))

      // deposit
      let depositTx = await this.formulateDepositTx(position.marketAddress!, wei(marginAmount))
      txs.push(depositTx)
    } else {
      await this.sdk.setProvider(provider)

      // no need to withdraw from 0-positioned markets
      // withdraw from the position
      let withdrawTx = await this.formulateWithdrawTx(position.marketAddress!, wei(marginAmount))
      txs.push(withdrawTx)
    }

    return txs
  }

  async getFillPrice(market: ExtendedMarket, order: Order): Promise<BigNumber> {
    const marketAddress = await this.getMarketAddress(market)

    return this.getFillPriceInternal(marketAddress, wei(order.sizeDelta))
  }

  async getFillPriceInternal(marketAddress: string, sizeDelta: Wei) {
    let fillPrice = await this.sdk.futures.getFillPrice(marketAddress, sizeDelta)

    return fillPrice.price
  }

  async getTradePreview(
    user: string,
    provider: Provider,
    market: ExtendedMarket,
    order: Order,
    existingPosition: ExtendedPosition | undefined,
    opts?: ApiOpts
  ) {
    const marketAddress = await this.getMarketAddress(market)
    const marketPrice = await this.getMarketPrice(market)

    await this.sdk.setProvider(provider)

    const futureMarket = this.mapExtendedMarketsToPartialFutureMarkets([market])[0]
    const sTimeSB = getStaleTime(CACHE_MINUTE, opts)
    const sUsdBalanceInMarket = await cacheFetch({
      key: [SYNV2_CACHE_PREFIX, 'sUSDBalanceMarket', user, market.indexOrIdentifier],
      fn: () => this.sdk.futures.getIdleMarginInMarketsCached(user, [futureMarket]).then((r) => r.totalIdleInMarkets),
      staleTime: sTimeSB,
      cacheTime: sTimeSB * CACHE_TIME_MULT,
      opts
    })

    let sizeDelta = wei(order.sizeDelta)
    sizeDelta = order.direction == 'LONG' ? sizeDelta : sizeDelta.neg()

    const tradePreviewPromise = this.sdk.futures.getSimulatedIsolatedTradePreview(
      user,
      getEnumEntryByValue(FuturesMarketKey, market.indexOrIdentifier!)!,
      marketAddress,
      {
        sizeDelta: sizeDelta,
        marginDelta: wei(order.inputCollateralAmount).sub(sUsdBalanceInMarket),
        orderPrice: wei(order.trigger!.triggerPrice)
      },
      opts
    )

    const sTimeKF = getStaleTime(CACHE_DAY, opts)
    const keeperFeePromise = cacheFetch({
      key: [SYNV2_CACHE_PREFIX, 'getMinKeeperFee'],
      fn: () => this.sdk.futures.getMinKeeperFee(),
      staleTime: sTimeKF,
      cacheTime: sTimeKF * CACHE_TIME_MULT,
      opts
    }) as Promise<BigNumber>

    const [tradePreview, keeperFee] = await Promise.all([tradePreviewPromise, keeperFeePromise])

    // We are using fillPrice instead of tradePreview.Price for priceimpact calculation
    // because tradePreview.Price takes into account existing position also and gives final average price basis that
    const fillPrice = tradePreview.fillPrice
    const mp = BigNumber.from(marketPrice!.value)
    const priceImpactPer = mp.sub(fillPrice).abs().mul(100).mul(BigNumber.from(10).pow(18)).div(mp)

    return {
      indexOrIdentifier: '',
      size: tradePreview.size.abs(),
      collateral: tradePreview.margin,
      collateralToken: this.sUsd,
      averageEntryPrice: tradePreview.price,
      liqudationPrice: tradePreview.liqPrice,
      otherFees: tradePreview.fee,
      status: tradePreview.status,
      fee: keeperFee as BigNumber,
      leverage:
        order.inputCollateralAmount && order.inputCollateralAmount.gt(0) && marketPrice
          ? tradePreview.size.mul(marketPrice.value).div(order.inputCollateralAmount).abs()
          : undefined,
      priceImpact: toNumberDecimal(priceImpactPer, 18),
      isError: tradePreview.status != PotentialTradeStatus.OK,
      error: this._getErrorString(tradePreview.status)
    }
  }

  async getEditCollateralPreview(
    user: string,
    provider: Provider,
    position: ExtendedPosition,
    marginDelta: BigNumber,
    isDeposit: boolean,
    opts?: ApiOpts
  ): Promise<ExtendedPosition> {
    const marketAddress = position.marketAddress!
    const marketPrice = BigNumber.from(this.getMarketPriceByIdentifier(position.marketIdentifier!)!.value)

    await this.sdk.setProvider(provider)

    const tradePreviewPromise = this.sdk.futures.getSimulatedIsolatedTradePreview(
      user,
      getEnumEntryByValue(FuturesMarketKey, position.indexOrIdentifier!)!,
      marketAddress,
      {
        sizeDelta: wei(0),
        marginDelta: isDeposit ? wei(marginDelta) : wei(marginDelta).neg(),
        orderPrice: wei(marketPrice)
      },
      opts
    )

    const sTimeKF = getStaleTime(CACHE_DAY, opts)
    const keeperFeePromise = cacheFetch({
      key: [SYNV2_CACHE_PREFIX, 'getMinKeeperFee'],
      fn: () => this.sdk.futures.getMinKeeperFee(),
      staleTime: sTimeKF,
      cacheTime: sTimeKF * CACHE_TIME_MULT,
      opts
    })

    const [tradePreview, keeperFee] = await Promise.all([tradePreviewPromise, keeperFeePromise])

    return {
      indexOrIdentifier: '',
      size: tradePreview.size.abs(),
      collateral: tradePreview.margin,
      collateralToken: this.sUsd,
      averageEntryPrice: tradePreview.price,
      liqudationPrice: tradePreview.liqPrice,
      otherFees: tradePreview.fee,
      status: tradePreview.status,
      fee: keeperFee as BigNumber,
      leverage: tradePreview.margin ? tradePreview.size.mul(marketPrice).div(tradePreview.margin).abs() : undefined,
      isError: tradePreview.status != PotentialTradeStatus.OK,
      error: this._getErrorString(tradePreview.status)
    }
  }

  async getCloseTradePreview(
    user: string,
    provider: Provider,
    position: ExtendedPosition,
    closeSize: BigNumber,
    isTrigger: boolean,
    triggerPrice: BigNumber | undefined,
    triggerAboveThreshold: boolean | undefined,
    outputToken: Token | undefined,
    opts?: ApiOpts
  ): Promise<ExtendedPosition> {
    const marketAddress = position.marketAddress!
    const marketPrice = BigNumber.from(this.getMarketPriceByIdentifier(position.marketIdentifier!)!.value)
    const isFullClose = closeSize.eq(position.size)
    await this.sdk.setProvider(provider)

    // because simulation is for only (partial) close position
    let sizeDeltaIn = position.direction == 'LONG' ? wei(closeSize).neg() : wei(closeSize)

    const tradePreviewPromise = this.sdk.futures.getSimulatedIsolatedTradePreview(
      user,
      getEnumEntryByValue(FuturesMarketKey, position.indexOrIdentifier!)!,
      marketAddress,
      {
        sizeDelta: sizeDeltaIn,
        marginDelta: wei(0),
        orderPrice: wei(marketPrice)
      },
      opts
    )

    const sTimeKF = getStaleTime(CACHE_DAY, opts)
    const keeperFeePromise = cacheFetch({
      key: [SYNV2_CACHE_PREFIX, 'getMinKeeperFee'],
      fn: () => this.sdk.futures.getMinKeeperFee(),
      staleTime: sTimeKF,
      cacheTime: sTimeKF * CACHE_TIME_MULT,
      opts
    })

    const [tradePreview, keeperFee] = await Promise.all([tradePreviewPromise, keeperFeePromise])

    return {
      indexOrIdentifier: '',
      size: tradePreview.size.abs(),
      collateral: isFullClose ? BigNumber.from(0) : tradePreview.margin,
      collateralToken: this.sUsd,
      averageEntryPrice: tradePreview.price,
      liqudationPrice: tradePreview.liqPrice,
      otherFees: tradePreview.fee,
      status: tradePreview.status,
      fee: keeperFee as BigNumber,
      leverage: tradePreview.margin ? tradePreview.size.mul(marketPrice).div(tradePreview.margin).abs() : undefined,
      receiveAmount: isFullClose ? tradePreview.margin : BigNumber.from(0),
      receiveUsd: isFullClose ? tradePreview.margin : BigNumber.from(0),
      isError: tradePreview.status != PotentialTradeStatus.OK,
      error: this._getErrorString(tradePreview.status)
    }
  }

  async getOrder(
    user: string,
    orderIdentifier: OrderIdentifier, // serves as market identifier for SNX
    market: ExtendedMarket
  ): Promise<ExtendedOrder> {
    const marketAddress = await this.getMarketAddress(market)

    const orderData = await this.sdk.futures.getDelayedOrder(user, marketAddress)

    if (orderData.size.eq(0)) {
      return {} as ExtendedOrder
    }

    const order: Order = {
      type: orderData.size.gt(0) ? 'MARKET_INCREASE' : 'MARKET_DECREASE',
      direction: orderData.side == PositionSide.LONG ? 'LONG' : 'SHORT',
      sizeDelta: orderData.size.abs().toBN(),
      isTriggerOrder: false,
      referralCode: undefined,
      trigger: {
        triggerPrice: orderData.desiredFillPrice.toBN(),
        triggerAboveThreshold: true
      },
      inputCollateral: this.sUsd,
      inputCollateralAmount: orderData.commitDeposit.toBN(),
      slippage: undefined
    }

    const orderAction: OrderAction = { orderAction: 'CREATE' }

    return {
      ...order,
      ...orderAction,
      ...{
        orderIdentifier: orderIdentifier.toString()
      },
      ...{
        indexOrIdentifier: market.indexOrIdentifier
      },
      triggerType: 'NONE'
    }
  }

  async getAllOrders(
    user: string,
    provider: Provider,
    openMarkets: OpenMarkets | undefined,
    pageOptions: PageOptions | undefined
  ): Promise<PaginatedRes<ExtendedOrder>> {
    throw new Error('Method not implemented.')
    // let markets = await this.getExtendedMarketsFromOpenMarkets(openMarkets);

    // let ordersData: ExtendedOrder[] = [];
    // markets.forEach(async (m) => {
    //   let orderData = await this.getOrder(user, m.indexOrIdentifier, m);
    //   if (orderData.orderIdentifier) {
    //     ordersData.push(orderData);
    //   }
    // });

    // return ordersData;
  }

  getAllOrdersForPosition(
    user: string,
    provider: Provider,
    position: ExtendedPosition,
    openMarkers: OpenMarkets | undefined
  ): Promise<Array<ExtendedOrder>> {
    throw new Error('Method not implemented.')
  }

  // will work as getOrder for SNX
  async getMarketOrders(user: string, market: ExtendedMarket): Promise<Array<ExtendedOrder>> {
    let ordersData: ExtendedOrder[] = []

    ordersData.push(await this.getOrder(user, market.indexOrIdentifier, market))

    return ordersData
  }

  async getPosition(
    positionIdentifier: Position['indexOrIdentifier'], // serves as market identifier for SNX
    market: OpenMarketData,
    user: string | undefined
  ): Promise<ExtendedPosition> {
    let extendedPosition: ExtendedPosition = {} as ExtendedPosition
    let marketAddress = await this.getMarketAddress(market)

    let futureMarkets: any[] = []
    futureMarkets.push({
      asset: getEnumEntryByValue(FuturesMarketAsset, market.asset!)!,
      marketKey: getEnumEntryByValue(FuturesMarketKey, market.indexOrIdentifier!)!,
      address: marketAddress
    })

    let futurePositions = await this.sdk.futures.getFuturesPositions(user!, futureMarkets)

    if (futurePositions.length != 0) {
      extendedPosition = this.mapFuturePositionToExtendedPosition(futurePositions[0], marketAddress)
    }

    return extendedPosition
  }

  async getAllPositions(
    user: string,
    provider: Provider,
    openMarkets: OpenMarkets | undefined,
    pageOptions: PageOptions | undefined
  ): Promise<PaginatedRes<ExtendedPosition>> {
    let extendedPositions: ExtendedPosition[] = []

    let markets = await this.getExtendedMarketsFromOpenMarkets(openMarkets)

    let futureMarkets: any[] = []

    for (let i = 0; i < markets.length; i++) {
      futureMarkets.push({
        asset: getEnumEntryByValue(FuturesMarketAsset, markets[i].asset!)!,
        marketKey: getEnumEntryByValue(FuturesMarketKey, markets[i].indexOrIdentifier!)!,
        address: markets[i].address!
      })
    }

    let futurePositions = await this.sdk.futures.getFuturesPositions(user, futureMarkets)
    // console.log("Future positions: ", futurePositions.length);
    // futurePositions.forEach((p) => {
    //   logObject("Future position: ", p);
    //   if (p.position) logObject("Inside Position: ", p.position);
    // });

    for (let i = 0; i < futurePositions.length; i++) {
      if (futurePositions[i].position == null) continue

      extendedPositions.push(
        this.mapFuturePositionToExtendedPosition(
          futurePositions[i],
          markets.find((m) => m.indexOrIdentifier == futurePositions[i].marketKey.toString())!.address!
        )
      )
    }
    // console.log("Extended positions: ", extendedPositions.length);
    // extendedPositions.forEach((p) => {
    //   logObject("Extended position: ", p);
    // });

    return getPaginatedResponse(extendedPositions, pageOptions)
  }

  async getTradesHistory(
    user: string,
    openMarkets: OpenMarkets | undefined,
    pageOptions: PageOptions | undefined
  ): Promise<PaginatedRes<TradeHistory>> {
    let trades: TradeHistory[] = []
    let markets = await this.getExtendedMarketsFromOpenMarkets(openMarkets)

    let tradesHistory = await this.sdk.futures.getAllTrades(user, 'isolated_margin', 1000)

    tradesHistory = tradesHistory.filter((t) => t.orderType !== 'Liquidation')

    tradesHistory.forEach((t) => {
      let market = markets.find((m) => m.asset == t.asset.toString())!
      trades.push({
        marketIdentifier: market.indexOrIdentifier,
        collateralToken: this.sUsd,
        // size: t.positionSize.toBN(),
        sizeDelta: t.size.toBN().abs(),
        collateralDelta: t.positionClosed ? t.margin.mul(-1).toBN() : t.margin.toBN(),
        price: t.price.toBN(),
        timestamp: t.timestamp,
        realisedPnl: t.pnl.toBN(),
        direction: t.side == PositionSide.LONG ? 'LONG' : 'SHORT',
        keeperFeesPaid: t.keeperFeesPaid.toBN(),
        positionFee: t.feesPaid.toBN(),
        operation: t.side == PositionSide.LONG ? 'Long' : 'Short',
        txHash: t.txnHash
      })
    })

    trades.sort((a, b) => b.timestamp - a.timestamp)

    return getPaginatedResponse(trades, pageOptions)
  }

  async getLiquidationsHistory(
    user: string,
    openMarkers: OpenMarkets | undefined,
    pageOptions: PageOptions | undefined
  ): Promise<PaginatedRes<LiquidationHistory>> {
    let trades: LiquidationHistory[] = []
    let markets = await this.getExtendedMarketsFromOpenMarkets(openMarkers)

    let tradesHistory = await this.sdk.futures.getAllTrades(user, 'isolated_margin', 1000)

    tradesHistory = tradesHistory.filter((t) => t.orderType == 'Liquidation')
    // tradesHistory.sort((a, b) => a.timestamp - b.timestamp);
    // tradesHistory.forEach((t) => {
    //   logObject("Liquidation: ", t);
    // });

    tradesHistory.forEach((t) => {
      let market = markets.find((m) => m.asset == t.asset.toString())!
      trades.push({
        marketIdentifier: market.indexOrIdentifier,
        collateralToken: this.sUsd,
        sizeClosed: t.size.abs().toBN(),
        remainingCollateral: t.margin.toBN(),
        liqudationLeverage: {
          value: market!.maxLeverage!.value,
          decimals: 18
        },
        liquidationPrice: t.price.toBN(),
        timestamp: t.timestamp,
        realisedPnl: t.pnl.toBN(),
        direction: t.side == PositionSide.LONG ? 'SHORT' : 'LONG', // reverse because this is counter trade
        liquidationFees: t.feesPaid.toBN(),
        txHash: t.txnHash
      })
    })

    trades.sort((a, b) => b.timestamp - a.timestamp)

    return getPaginatedResponse(trades, pageOptions)
  }

  async getIdleMargins(
    user: string,
    openMarkets: OpenMarkets | undefined
  ): Promise<(MarketIdentifier & CollateralData)[]> {
    const result = await this.sdk.futures.getIdleMarginInMarketsCached(
      user,
      await this.getPartialFutureMarketsFromOpenMarkets(openMarkets)
    )

    return result.marketsWithIdleMargin.map((m) => ({
      indexOrIdentifier: FuturesMarketKey[m.marketKey].toString(),
      inputCollateral: this.sUsd,
      inputCollateralAmount: m.position.accessibleMargin.toBN()
    }))
  }

  async getAvailableSusdBalance(user: string, openMarkets: OpenMarkets | undefined): Promise<BigNumber> {
    const result = await this.sdk.futures.getIdleMarginInMarketsCached(
      user,
      await this.getPartialFutureMarketsFromOpenMarkets(openMarkets)
    )
    return result.totalIdleInMarkets.toBN()
  }

  async withdrawUnusedCollateral(user: string, provider: Provider): Promise<UnsignedTxWithMetadata[]> {
    let txs: UnsignedTxWithMetadata[] = []

    await this.sdk.setProvider(provider)
    // withdraw unused collateral tx's
    const idleMargins = await this.sdk.futures.getIdleMarginInMarkets(user)

    if (idleMargins.totalIdleInMarkets.gt(0)) {
      let idleMarkets = idleMargins.marketsWithIdleMargin

      for (let i = 0; i < idleMarkets.length; i++) {
        let withdrawTx = await this.formulateWithdrawTx(
          idleMarkets[i].marketAddress,
          idleMarkets[i].position!.remainingMargin
        )
        // logObject("withdrawTx", withdrawTx);

        txs.push(withdrawTx)
      }
    }

    return txs
  }

  async deposit(
    provider: Provider,
    market: ExtendedMarket,
    depositAmount: BigNumber
  ): Promise<UnsignedTxWithMetadata[]> {
    const marketAddress = await this.getMarketAddress(market)
    const depositTx = await this.formulateDepositTx(marketAddress, wei(depositAmount))

    return [depositTx]
  }

  async withdraw(
    provider: Provider,
    market: ExtendedMarket,
    withdrawAmount: BigNumber
  ): Promise<UnsignedTxWithMetadata[]> {
    const marketAddress = await this.getMarketAddress(market)
    let withdrawTx = await this.formulateWithdrawTx(marketAddress, wei(withdrawAmount))

    return [withdrawTx]
  }

  //// HELPERS ////

  mapFuturePositionToExtendedPosition(futurePosition: FuturesPosition, marketAddress: string): ExtendedPosition {
    return {
      indexOrIdentifier: futurePosition.marketKey.toString(),
      size: futurePosition.position!.size.toBN(),
      collateral: futurePosition.position!.initialMargin.toBN(),
      collateralToken: this.sUsd,
      averageEntryPrice: futurePosition.position!.lastPrice.toBN(),
      cumulativeFunding: futurePosition.position!.accruedFunding.toBN(),
      unrealizedPnl: futurePosition.position!.pnl.toBN(),
      liqudationPrice: futurePosition.position!.liquidationPrice.toBN(),
      leverage: futurePosition.position!.initialLeverage.toBN(),
      direction: futurePosition.position!.side == PositionSide.LONG ? 'LONG' : 'SHORT',
      accessibleMargin: futurePosition.accessibleMargin.toBN(),
      marketAddress: marketAddress,
      marketIdentifier: futurePosition.marketKey.toString(),
      protocolMetadata: {
        protocolName: this.protocolIdentifier
      }
    }
  }

  mapOpenMarketsToExtendedMarkets(openMarkets: OpenMarkets): ExtendedMarket[] {
    let extendedMarkets: ExtendedMarket[] = []
    Object.keys(openMarkets).forEach((key) => {
      openMarkets[key]
        .filter((m) => m.protocolName && m.protocolName == this.protocolIdentifier)
        .forEach((m) => {
          extendedMarkets.push(m)
        })
    })
    return extendedMarkets
  }

  mapExtendedMarketsToPartialFutureMarkets(extendedMarkets: ExtendedMarket[]): Partial<FuturesMarket>[] {
    let futureMarkets: Partial<FuturesMarket>[] = []
    extendedMarkets
      .filter((m) => m.protocolName && m.protocolName == this.protocolIdentifier)
      .forEach((m) => {
        futureMarkets.push({
          asset: getEnumEntryByValue(FuturesMarketAsset, m.asset!)!,
          marketKey: getEnumEntryByValue(FuturesMarketKey, m.indexOrIdentifier!)!,
          market: m.address!
        })
      })
    return futureMarkets
  }

  async getExtendedMarketsFromOpenMarkets(openMarkets: OpenMarkets | undefined): Promise<ExtendedMarket[]> {
    let supportedMarkets: ExtendedMarket[] = []
    if (openMarkets) {
      supportedMarkets = this.mapOpenMarketsToExtendedMarkets(openMarkets)
    } else {
      supportedMarkets = await this.supportedMarkets(this.supportedNetworks()[0])
    }
    return supportedMarkets
  }

  async getPartialFutureMarketsFromOpenMarkets(
    openMarkets: OpenMarkets | undefined
  ): Promise<Partial<FuturesMarket>[]> {
    let extendedMarkets = await this.getExtendedMarketsFromOpenMarkets(openMarkets)
    return this.mapExtendedMarketsToPartialFutureMarkets(extendedMarkets)
  }

  async formulateWithdrawTx(marketAddress: string, withdrawAmount: Wei) {
    const withdrawTx = (await this.sdk.futures.withdrawIsolatedMargin(
      marketAddress,
      withdrawAmount
    )) as UnsignedTransaction

    return {
      tx: withdrawTx,
      type: 'SNX_V2',
      data: undefined,
      heading: 'Withdraw',
      desc: 'Withdraw'
    } as UnsignedTxWithMetadata
  }

  async formulateDepositTx(marketAddress: string, depositAmount: Wei) {
    const depositTx = (await this.sdk.futures.depositIsolatedMargin(
      marketAddress,
      depositAmount
    )) as UnsignedTransaction

    return {
      tx: depositTx,
      type: 'SNX_V2',
      data: undefined,
      heading: 'Deposit',
      desc: 'Deposit'
    } as UnsignedTxWithMetadata
  }

  _getErrorString(status: PotentialTradeStatus): string {
    switch (status) {
      case PotentialTradeStatus.OK:
        return ''
      case PotentialTradeStatus.INVALID_PRICE:
        return 'Invalid price'
      case PotentialTradeStatus.INVALID_ORDER_PRICE:
        return 'Invalid order price'
      case PotentialTradeStatus.PRICE_OUT_OF_BOUNDS:
        return 'Price out of bounds'
      case PotentialTradeStatus.CAN_LIQUIDATE:
        return 'Can liquidate'
      case PotentialTradeStatus.CANNOT_LIQUIDATE:
        return 'Cannot liquidate'
      case PotentialTradeStatus.MAX_MARKET_SIZE_EXCEEDED:
        return 'Max market size exceeded'
      case PotentialTradeStatus.MAX_LEVERAGE_EXCEEDED:
        return 'Max leverage exceeded'
      case PotentialTradeStatus.INSUFFICIENT_MARGIN:
        return 'Insufficient margin'
      case PotentialTradeStatus.NOT_PERMITTED:
        return 'Not permitted'
      case PotentialTradeStatus.NIL_ORDER:
        return 'Nil order'
      case PotentialTradeStatus.NO_POSITION_OPEN:
        return 'No position open'
      case PotentialTradeStatus.PRICE_TOO_VOLATILE:
        return 'Price too volatile'
      case PotentialTradeStatus.PRICE_IMPACT_TOLERANCE_EXCEEDED:
        return 'Price impact tolerance exceeded'
      case PotentialTradeStatus.INSUFFICIENT_FREE_MARGIN:
        return 'Insufficient free margin'
      default:
        return ''
    }
  }
}
