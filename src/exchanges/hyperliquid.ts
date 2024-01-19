import { Chain } from 'viem'
import { FixedNumber, abs, addFN, bipsDiff, divFN, mulFN } from '../common/fixedNumber'
import { IAdapterV1 } from '../interfaces/V1/IAdapterV1'
import {
  ApiOpts,
  UnsignedTxWithMetadata,
  MarketInfo,
  DynamicMarketMetadata,
  CreateOrder,
  UpdateOrder,
  CancelOrder,
  PositionInfo,
  ClosePositionData,
  UpdatePositionMarginData,
  IdleMarginInfo,
  PageOptions,
  PaginatedRes,
  OrderInfo,
  HistoricalTradeInfo,
  LiquidationInfo,
  ClaimInfo,
  OpenTradePreviewInfo,
  CloseTradePreviewInfo,
  AmountInfo,
  PreviewInfo,
  Market,
  GenericStaticMarketMetadata,
  Protocol,
  ProtocolId,
  TradeData,
  TriggerData,
  OrderType,
  AccountInfo,
  AmountInfoInToken
} from '../interfaces/V1/IRouterAdapterBaseV1'
import { CACHE_DAY, CACHE_SECOND, CACHE_TIME_MULT, cacheFetch, getStaleTime, HL_CACHE_PREFIX } from '../common/cache'
import {
  HL_COLLATERAL_TOKEN,
  HL_TOKENS_MAP,
  getActiveAssetData,
  getAllMids,
  getClearinghouseState,
  getL2Book,
  getMeta,
  getMetaAndAssetCtxs,
  getOpenOrders,
  getOrderStatus,
  getUserFills
} from '../configs/hyperliquid/api/client'
import {
  AssetCtx,
  AssetPosition,
  L2Book,
  Meta,
  MetaAndAssetCtx,
  OpenOrders,
  OrderStatusInfo
} from '../configs/hyperliquid/api/types'
import { encodeMarketId } from '../common/markets'
import { hyperliquid, HL_MAKER_FEE_BPS } from '../configs/hyperliquid/api/config'
import { parseUnits } from 'ethers/lib/utils'
import { indexBasisSlippage } from '../configs/hyperliquid/helper'
import { getPaginatedResponse, toAmountInfoFN, validDenomination } from '../common/helper'
import { TraverseResult, traverseHLBook } from '../configs/hyperliquid/obTraversal'
import { estLiqPrice } from '../configs/hyperliquid/liqPrice'

export default class HyperliquidAdapterV1 implements IAdapterV1 {
  private minCollateralUsd = parseUnits('11', 30)
  private minPositionUsd = parseUnits('11', 30)

  async init(swAddr: string, opts?: ApiOpts | undefined): Promise<void> {
    await cacheFetch({
      key: [HL_CACHE_PREFIX, 'meta'],
      fn: () => getMeta(),
      staleTime: 0,
      cacheTime: 0,
      opts: opts
    })
  }

  setup(): Promise<UnsignedTxWithMetadata[]> {
    return Promise.resolve([])
  }

  supportedChains(opts?: ApiOpts | undefined): Chain[] {
    return [hyperliquid]
  }

  async supportedMarkets(chains: Chain[] | undefined, opts?: ApiOpts | undefined): Promise<MarketInfo[]> {
    let marketInfo: MarketInfo[] = []

    let sTimeMarkets = getStaleTime(CACHE_DAY, opts)
    const meta = (await cacheFetch({
      key: [HL_CACHE_PREFIX, 'meta'],
      fn: () => getMeta(),
      staleTime: sTimeMarkets,
      cacheTime: sTimeMarkets * CACHE_TIME_MULT,
      opts: opts
    })) as Meta

    meta.universe.forEach((u) => {
      const market: Market = {
        marketId: encodeMarketId(hyperliquid.id.toString(), 'HL', u.name),
        chain: hyperliquid,
        indexToken: HL_TOKENS_MAP[u.name],
        longCollateral: [HL_COLLATERAL_TOKEN],
        shortCollateral: [HL_COLLATERAL_TOKEN],
        supportedModes: {
          ISOLATED: true,
          CROSS: !u.onlyIsolated
        },
        supportedOrderTypes: {
          LIMIT: true,
          MARKET: true,
          STOP_LOSS: true,
          TAKE_PROFIT: true,
          STOP_LOSS_LIMIT: true,
          TAKE_PROFIT_LIMIT: true,
          REDUCE_LIMIT: true
        },
        supportedOrderActions: {
          CREATE: true,
          UPDATE: true,
          CANCEL: true
        },
        marketSymbol: u.name
      }

      const staticMetadata: GenericStaticMarketMetadata = {
        maxLeverage: FixedNumber.fromString(u.maxLeverage.toString()),
        minLeverage: FixedNumber.fromString('1'),
        minInitialMargin: FixedNumber.fromValue(this.minCollateralUsd.toString(), 30, 30),
        minPositionSize: FixedNumber.fromValue(this.minPositionUsd.toString(), 30, 30)
      }

      const protocol: Protocol = {
        protocolId: 'HL'
      }

      marketInfo.push({
        ...market,
        ...staticMetadata,
        ...protocol
      })
    })

    return marketInfo
  }

  async getMarketsInfo(marketIds: string[], opts?: ApiOpts | undefined): Promise<MarketInfo[]> {
    let marketInfo: MarketInfo[] = []

    const supportedMarkets = await this.supportedMarkets(this.supportedChains(), opts)

    marketIds.forEach((mId) => {
      const market = supportedMarkets.find((m) => m.marketId === mId)
      if (market) {
        marketInfo.push(market)
      }
    })

    return marketInfo
  }

  async getMarketState(wallet: string, marketIds: string[], opts?: ApiOpts | undefined): Promise<MarketState[]> {
    // populate meta
    await this._populateMeta(opts)

    // get markets
    const markets = await this.getMarketsInfo(marketIds, opts)

    // get active asset data for all markets
    const activeAssetsData = await Promise.all(
      markets.map((m) => getActiveAssetData(wallet, HL_TOKENS_MAP[m.marketSymbol].assetIndex))
    )

    // populate marketStates
    const marketStates: MarketState[] = []
    for (const ad of activeAssetsData) {
      marketStates.push({
        leverage: FixedNumber.fromString(ad.leverage.value.toString()),
        marketMode: ad.leverage.type === 'isolated' ? 'ISOLATED' : 'CROSS'
      })
    }

    return marketStates
  }

  async getMarketPrices(marketIds: string[], opts?: ApiOpts | undefined): Promise<FixedNumber[]> {
    const prices: FixedNumber[] = []

    const markets = await this.getMarketsInfo(marketIds, opts)
    const mids = await getAllMids()

    markets.forEach((m) => {
      const mid = mids[m.indexToken.symbol]
      if (mid) {
        prices.push(FixedNumber.fromString(mid, 30))
      } else {
        throw new Error(`No mid for ${m.marketSymbol}`)
      }
    })

    return prices
  }

  async getDynamicMarketMetadata(marketIds: string[], opts?: ApiOpts | undefined): Promise<DynamicMarketMetadata[]> {
    let dynamicMarketMetadata: DynamicMarketMetadata[] = []

    const markets = await this.getMarketsInfo(marketIds, opts)
    const coins = markets.map((m) => m.indexToken.symbol)

    // metaAndAssetCtxs promise
    const sTimeDM = getStaleTime(CACHE_SECOND * 20, opts)
    const metaAndAssetCtxsPromise = cacheFetch({
      key: [HL_CACHE_PREFIX, 'metaAndAssetCtxs'],
      fn: () => getMetaAndAssetCtxs(),
      staleTime: sTimeDM,
      cacheTime: sTimeDM * CACHE_TIME_MULT,
      opts: opts
    }) as Promise<MetaAndAssetCtx>

    // l2Book promises for estimating liquidity
    const l2BookPromises: Promise<L2Book>[] = []
    // nSigFigs = 3 gives concentrated book to estimate liquidity better
    const nSigFigs = 3
    const sTimeL2Book = getStaleTime(CACHE_SECOND * 20, opts)
    coins.forEach(async (c) => {
      l2BookPromises.push(
        cacheFetch({
          key: [HL_CACHE_PREFIX, 'l2Book', c, nSigFigs],
          fn: () => getL2Book(c, nSigFigs),
          staleTime: sTimeL2Book,
          cacheTime: sTimeL2Book * CACHE_TIME_MULT,
          opts: opts
        }) as Promise<L2Book>
      )
    })

    const [metaAndAssetCtxs, ...l2Books] = await Promise.all([metaAndAssetCtxsPromise, ...l2BookPromises])

    const assetCtxMap: Record<string, AssetCtx> = {}
    const universe = metaAndAssetCtxs[0].universe
    const assetCtxs = metaAndAssetCtxs[1]
    for (let i = 0; i < universe.length; i++) {
      const u = universe[i]
      assetCtxMap[u.name] = assetCtxs[i]
    }

    const l2BookMap: Record<string, L2Book> = {}
    l2Books.forEach((l2Book) => {
      l2BookMap[l2Book.coin] = l2Book
    })

    coins.forEach((c) => {
      const assetCtx = assetCtxMap[c]
      const l2Book = l2BookMap[c]
      if (assetCtx && l2Book) {
        const totalOi = FixedNumber.fromString(assetCtx.openInterest)
        const op = FixedNumber.fromString(assetCtx.oraclePx)
        const oracleOi = op.mul(totalOi).div(FixedNumber.fromString('2'))

        let bids = l2Book.levels[0]
        let asks = l2Book.levels[1]

        // count liquidity till LIQUIDITY_SLIPPAGE in bps
        const LIQUIDITY_SLIPPAGE = '200'
        // slice bids and asks till LIQUIDITY_SLIPPAGE
        bids = bids.slice(0, indexBasisSlippage(bids, LIQUIDITY_SLIPPAGE) + 1)
        asks = asks.slice(0, indexBasisSlippage(asks, LIQUIDITY_SLIPPAGE) + 1)

        // long liquidity is the total available asks (sell orders) in the book
        const longLiquidity = asks.reduce(
          (acc, ask) => acc.add(FixedNumber.fromString(ask.px).mul(FixedNumber.fromString(ask.sz))),
          FixedNumber.fromString('0')
        )
        // short liquidity is the total available bids (buy orders) in the book
        const shortLiquidity = bids.reduce(
          (acc, bid) => acc.add(FixedNumber.fromString(bid.px).mul(FixedNumber.fromString(bid.sz))),
          FixedNumber.fromString('0')
        )

        dynamicMarketMetadata.push({
          oiLong: oracleOi,
          oiShort: oracleOi,
          availableLiquidityLong: longLiquidity,
          availableLiquidityShort: shortLiquidity,
          longFundingRate: FixedNumber.fromString(assetCtx.funding),
          shortFundingRate: FixedNumber.fromString(assetCtx.funding).mul(FixedNumber.fromString('-1')),
          longBorrowRate: FixedNumber.fromString('0'),
          shortBorrowRate: FixedNumber.fromString('0')
        })
      } else {
        throw new Error(`No assetCtx/l2book for ${c}`)
      }
    })

    return dynamicMarketMetadata
  }

  increasePosition(
    orderData: CreateOrder[],
    wallet: string,
    opts?: ApiOpts | undefined
  ): Promise<UnsignedTxWithMetadata[]> {
    throw new Error('Method not implemented.')
  }
  updateOrder(orderData: UpdateOrder[], wallet: string, opts?: ApiOpts | undefined): Promise<UnsignedTxWithMetadata[]> {
    throw new Error('Method not implemented.')
  }
  cancelOrder(orderData: CancelOrder[], wallet: string, opts?: ApiOpts | undefined): Promise<UnsignedTxWithMetadata[]> {
    throw new Error('Method not implemented.')
  }
  closePosition(
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[],
    wallet: string,
    opts?: ApiOpts | undefined
  ): Promise<UnsignedTxWithMetadata[]> {
    throw new Error('Method not implemented.')
  }
  updatePositionMargin(
    positionInfo: PositionInfo[],
    updatePositionMarginData: UpdatePositionMarginData[],
    wallet: string,
    opts?: ApiOpts | undefined
  ): Promise<UnsignedTxWithMetadata[]> {
    throw new Error('Method not implemented.')
  }
  claimFunding(wallet: string, opts?: ApiOpts | undefined): Promise<UnsignedTxWithMetadata[]> {
    throw new Error('Method not implemented.')
  }

  // clearinghouse states
  getIdleMargins(wallet: string, opts?: ApiOpts | undefined): Promise<IdleMarginInfo[]> {
    throw new Error('Method not implemented.')
  }

  async getAllPositions(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<PositionInfo>> {
    const positions: PositionInfo[] = []

    const clearinghouseState = await getClearinghouseState(wallet)
    const assetPositions = clearinghouseState.assetPositions
    const marketModes = (
      await this.getMarketState(
        wallet,
        assetPositions.map((ap) => encodeMarketId(hyperliquid.id.toString(), 'HL', ap.position.coin)),
        opts
      )
    ).map((ms) => ms.marketMode)

    assetPositions.forEach((ap, index) => {
      const position = ap.position
      const coin = position.coin
      const collateral = HL_COLLATERAL_TOKEN
      const indexToken = HL_TOKENS_MAP[coin]
      const marketId = encodeMarketId(hyperliquid.id.toString(), 'HL', coin)
      const posId = `${marketId}-${wallet}`
      const leverage = FixedNumber.fromString(position.leverage.value.toString())
      const marginUsed = FixedNumber.fromString(position.marginUsed)
      const positionValue = FixedNumber.fromString(position.positionValue)
      const unrealizedPnl = FixedNumber.fromString(position.unrealizedPnl)
      let accessibleMargin = marginUsed.sub(positionValue.div(leverage))
      accessibleMargin = accessibleMargin.isNegative() ? FixedNumber.fromString('0') : accessibleMargin
      if (accessibleMargin._value.includes('.')) {
        accessibleMargin = accessibleMargin.mul(FixedNumber.fromString('100'))
        accessibleMargin = FixedNumber.fromString(accessibleMargin._value.split('.')[0])
        accessibleMargin = accessibleMargin.div(FixedNumber.fromString('100'))
      }
      let size = FixedNumber.fromString(position.szi)

      const posInfo: PositionInfo = {
        marketId: marketId,
        posId: posId,
        size: toAmountInfoFN(abs(size), true),
        margin: toAmountInfoFN(marginUsed, false),
        accessibleMargin: toAmountInfoFN(accessibleMargin, false),
        avgEntryPrice: FixedNumber.fromString(position.entryPx),
        cumulativeFunding: FixedNumber.fromString(position.cumFunding.allTime),
        unrealizedPnl: unrealizedPnl,
        liquidationPrice: position.liquidationPx
          ? FixedNumber.fromString(position.liquidationPx)
          : FixedNumber.fromString('0'),
        leverage: leverage,
        direction: size.isNegative() ? 'SHORT' : 'LONG',
        collateral: collateral,
        indexToken: indexToken,
        protocolId: 'HL',
        metadata: ap,
        mode: marketModes[index]
      }

      positions.push(posInfo)
    })

    return getPaginatedResponse(positions, pageOptions)
  }

  async getAllOrders(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<OrderInfo>> {
    const ordersInfo: OrderInfo[] = []

    // get all open orders
    const ordersPromise = getOpenOrders(wallet)
    // getAllPositions - because for TP/SL orders that close the position entirely, size is not provided in order/status
    const clearinghouseStatePromise = getClearinghouseState(wallet)
    const [orders, clearinghouseState] = await Promise.all([ordersPromise, clearinghouseStatePromise])

    // get order status for each order
    const orderStatusPromises = orders.map((o) => getOrderStatus(wallet, o.oid))
    const ordersStatus = await Promise.all(orderStatusPromises)

    const assetPositions = clearinghouseState.assetPositions

    // create a map to assemble all info in one place
    const ordersMap: Record<
      number,
      {
        order: OpenOrders
        status: OrderStatusInfo
        pos: AssetPosition | undefined
      }
    > = {}
    orders.forEach((o) => {
      ordersMap[o.oid] = {
        order: o,
        status: ordersStatus.find((os) => os.order.order.oid === o.oid)!,
        pos: assetPositions.find((ap) => ap.position.coin === o.coin)
      }
    })

    Object.entries(ordersMap).forEach(([oid, o]) => {
      const order = o.order
      const status = o.status.order.order
      const posSize = o.pos?.position.szi

      const coin = order.coin
      const collateral = HL_COLLATERAL_TOKEN
      const orderSizeDelta = FixedNumber.fromString(order.sz)
      const sizeDelta = orderSizeDelta.isZero() ? FixedNumber.fromString(posSize!) : orderSizeDelta

      const tradeData: TradeData = {
        marketId: encodeMarketId(hyperliquid.id.toString(), 'HL', coin),
        direction: order.side === 'B' ? 'LONG' : 'SHORT',
        sizeDelta: toAmountInfoFN(sizeDelta, true),
        marginDelta: toAmountInfoFN(FixedNumber.fromString('0'), false) // TODO - check
      }

      let triggerPrice = FixedNumber.fromString('0')
      if (status.orderType == 'Limit' || status.orderType == 'Stop Limit' || status.orderType == 'Take Profit Limit') {
        // for limit order limit price is the actual trigger price
        triggerPrice = FixedNumber.fromString(status.limitPx)
      } else {
        // for market orders trigger price is the trigger price
        triggerPrice = FixedNumber.fromString(status.triggerPx)
      }

      let triggerAboveThreshold = false
      if (status.orderType == 'Limit') {
        // for limit Buy order the order is valid once the price is below the limit price and vice versa
        triggerAboveThreshold = status.side === 'A'
      } else {
        triggerAboveThreshold = status.triggerCondition.toLowerCase().includes('above'.toLowerCase())
      }
      let triggerActivatePrice = undefined
      if (status.orderType == 'Stop Limit' || status.orderType == 'Take Profit Limit') {
        triggerActivatePrice = FixedNumber.fromString(status.triggerPx)
      }
      const triggerData: TriggerData = {
        triggerPrice,
        triggerAboveThreshold,
        triggerActivatePrice
      }

      let orderType: OrderType
      const reduceOnly = status.reduceOnly
      switch (status.orderType) {
        case 'Limit':
          orderType = reduceOnly ? 'REDUCE_LIMIT' : 'LIMIT'
          break
        case 'Stop Market':
          orderType = 'STOP_LOSS'
          break
        case 'Stop Limit':
          orderType = 'STOP_LOSS_LIMIT'
          break
        case 'Take Profit Market':
          orderType = 'TAKE_PROFIT'
          break
        case 'Take Profit Limit':
          orderType = 'TAKE_PROFIT_LIMIT'
          break
        default:
          throw new Error(`Unknown order type ${status.orderType}`)
      }

      const orderInfo: OrderInfo = {
        ...tradeData,
        triggerData: triggerData,
        marketId: encodeMarketId(hyperliquid.id.toString(), 'HL', coin),
        orderId: oid,
        orderType,
        collateral: HL_COLLATERAL_TOKEN,
        protocolId: 'HL'
      }

      ordersInfo.push(orderInfo)
    })

    return getPaginatedResponse(ordersInfo, pageOptions)
  }

  async getAllOrdersForPosition(
    wallet: string,
    positionInfo: PositionInfo[],
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<Record<string, PaginatedRes<OrderInfo>>> {
    const allOrders = (await this.getAllOrders(wallet, undefined, opts)).result
    const ordersForPositionInternal: Record<string, OrderInfo[]> = {}

    for (const o of allOrders) {
      for (const p of positionInfo) {
        if (o.marketId === p.marketId) {
          if (ordersForPositionInternal[p.posId] === undefined) {
            ordersForPositionInternal[p.posId] = []
          }
          ordersForPositionInternal[p.posId].push(o)
        }
      }
    }

    const ordersForPosition: Record<string, PaginatedRes<OrderInfo>> = {}
    for (const posId of Object.keys(ordersForPositionInternal)) {
      ordersForPosition[posId] = getPaginatedResponse(ordersForPositionInternal[posId], pageOptions)
    }

    return ordersForPosition
  }

  async getTradesHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<HistoricalTradeInfo>> {
    const trades: HistoricalTradeInfo[] = []

    // get user fills except liquidations
    const userFills = (await getUserFills(wallet)).filter((uf) => uf.liquidationMarkPx == null)

    for (const uf of userFills) {
      const marketId = encodeMarketId(hyperliquid.id.toString(), 'HL', uf.coin)

      const tradeData: TradeData = {
        marketId: marketId,
        direction: uf.side === 'B' ? 'LONG' : 'SHORT',
        sizeDelta: toAmountInfoFN(FixedNumber.fromString(uf.sz), true),
        marginDelta: toAmountInfoFN(FixedNumber.fromString('0'), true) // TODO: no margin delta for fills because HL doesn't provide
      }

      const collateralData: CollateralData = {
        collateral: HL_COLLATERAL_TOKEN
      }

      trades.push({
        ...tradeData,
        ...collateralData,
        timestamp: Math.floor(uf.time / 1000),
        indexPrice: FixedNumber.fromString(uf.px),
        collateralPrice: FixedNumber.fromString('1'),
        realizedPnl: FixedNumber.fromString(uf.closedPnl),
        keeperFeesPaid: FixedNumber.fromString('0'),
        positionFee: FixedNumber.fromString(uf.fee),
        operationType: uf.dir as TradeOperationType,
        txHash: uf.hash
      })
    }

    return getPaginatedResponse(trades, pageOptions)
  }

  async getLiquidationHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<LiquidationInfo>> {
    const liquidations: LiquidationInfo[] = []

    // get user fills for liquidtions
    const userFills = (await getUserFills(wallet)).filter((uf) => uf.liquidationMarkPx != null)
    // get unique marketIds
    const marketIds = [...new Set(userFills.map((uf) => encodeMarketId(hyperliquid.id.toString(), 'HL', uf.coin)))]
    const marketMaxLevMap: Record<string, FixedNumber> = {}
    ;(await this.getMarketsInfo(marketIds, opts)).forEach((m) => {
      marketMaxLevMap[m.marketId] = m.maxLeverage
    })

    for (const uf of userFills) {
      const marketId = encodeMarketId(hyperliquid.id.toString(), 'HL', uf.coin)

      const collateralData: CollateralData = {
        collateral: HL_COLLATERAL_TOKEN
      }

      liquidations.push({
        ...collateralData,
        marketId: marketId,
        liquidationPrice: FixedNumber.fromString(uf.liquidationMarkPx!),
        direction: uf.side === 'B' ? 'LONG' : 'SHORT',
        sizeClosed: toAmountInfoFN(FixedNumber.fromString(uf.sz), true),
        realizedPnl: FixedNumber.fromString(uf.closedPnl),
        liquidationFees: FixedNumber.fromString(uf.fee),
        remainingCollateral: toAmountInfoFN(FixedNumber.fromString('0'), true), // TODO: no remainingCollateral for fills because HL doesn't provide margin info
        liqudationLeverage: marketMaxLevMap[marketId],
        timestamp: Math.floor(uf.time / 1000),
        txHash: uf.hash
      })
    }

    return getPaginatedResponse(liquidations, pageOptions)
  }

  getClaimHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<ClaimInfo>> {
    throw new Error('Method not implemented.')
  }

  async getOpenTradePreview(
    wallet: string,
    orderData: CreateOrder[],
    existingPos: (PositionInfo | undefined)[],
    opts?: ApiOpts | undefined
  ): Promise<OpenTradePreviewInfo[]> {
    const previewsInfo: OpenTradePreviewInfo[] = []

    // get markets and marketStates
    const marketsPromise = this.getMarketsInfo(
      orderData.map((o) => o.marketId),
      opts
    )
    const marketStatesPromise = this.getMarketState(
      wallet,
      orderData.map((o) => o.marketId),
      opts
    )
    const allMidsPromise = getAllMids()

    const web2DataReq = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: `{"type":"webData2","user":"${wallet}"}`
    }
    const url = 'https://api-ui.hyperliquid.xyz/info'
    const web2DataPromise = fetch(url, web2DataReq).then((resp) => resp.text())

    const [markets, marketStates, mids, web2Data] = await Promise.all([
      marketsPromise,
      marketStatesPromise,
      allMidsPromise,
      web2DataPromise
    ])

    for (let i = 0; i < orderData.length; i++) {
      const od = orderData[i]
      const epos = existingPos[i]
      const m = markets[i]
      const ms = marketStates[i]
      const isCross = ms.marketMode == 'CROSS'
      const orderSize = od.sizeDelta.amount
      const ml = ms.leverage
      const coin = m.indexToken.symbol
      const mid = mids[coin]
      const mp = FixedNumber.fromString(mid, 30)
      const trigPrice = od.triggerData ? od.triggerData.triggerPrice : mp
      const isMarket = od.type == 'MARKET'

      // traverseOrderBook for market orders
      let traResult: TraverseResult | undefined = undefined
      if (isMarket) {
        traResult = await traverseHLBook(od.marketId, od.direction, orderSize, mp)
        // console.log(traResult)
      }

      if (!validDenomination(od.sizeDelta, true)) throw new Error('Size delta must be token denominated')
      if (!validDenomination(od.marginDelta, true)) throw new Error('Margin delta must be token denominated')

      // next size is pos.size + orderSize if direction is same else pos.size - orderSize
      const nextSize = epos
        ? epos.direction == od.direction
          ? abs(epos.size.amount.add(orderSize))
          : abs(epos.size.amount.sub(orderSize))
        : orderSize

      // next margin is always position / leverage
      const nextMargin = divFN(mulFN(nextSize, trigPrice), ml)

      const liqPrice = estLiqPrice(
        wallet,
        parseFloat(mid),
        parseFloat(ml._value),
        !isCross,
        parseFloat(orderSize._value),
        parseFloat(trigPrice._value),
        od.direction == 'LONG',
        coin,
        web2Data
      )

      const nextEntryPrice = isMarket ? traResult!.avgExecPrice : trigPrice
      let avgEntryPrice = nextEntryPrice
      if (epos) {
        if (epos.direction == od.direction) {
          // average entry price
          // posSize * posEntryPrice + orderSize * orderEntryPrice / (posSize + orderSize)
          avgEntryPrice = divFN(
            addFN(mulFN(epos.size.amount, epos.avgEntryPrice), mulFN(orderSize, nextEntryPrice)),
            nextSize
          )
        } else {
          if (epos.size.amount.gt(orderSize)) {
            // partial close would result in previous entry price
            avgEntryPrice = epos.avgEntryPrice
          } else {
            // direction would change and hence newer entry price would be the avgEntryprice
            avgEntryPrice = nextEntryPrice
          }
        }
      }

      const fee = isMarket
        ? traResult!.fees
        : mulFN(mulFN(orderSize, trigPrice), FixedNumber.fromString(HL_MAKER_FEE_BPS))
      const priceImpact = isMarket ? traResult!.priceImpact : FixedNumber.fromString('0')

      const isError = traResult ? (traResult.priceImpact.eq(FixedNumber.fromString('100')) ? true : false) : false

      const preview = {
        marketId: od.marketId,
        collateral: od.collateral,
        leverage: ml,
        size: toAmountInfoFN(nextSize, true),
        margin: toAmountInfoFN(nextMargin, true),
        avgEntryPrice: avgEntryPrice,
        liqudationPrice: liqPrice == null ? FixedNumber.fromString('0') : FixedNumber.fromString(liqPrice.toString()),
        fee: fee,
        priceImpact: priceImpact,
        isError: isError,
        errMsg: isError ? 'Price impact is too high' : ''
      }
      // console.log(preview)

      previewsInfo.push(preview)
    }

    return previewsInfo
  }

  getCloseTradePreview(
    wallet: string,
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[],
    opts?: ApiOpts | undefined
  ): Promise<CloseTradePreviewInfo[]> {
    throw new Error('Method not implemented.')
  }
  getUpdateMarginPreview(
    wallet: string,
    isDeposit: boolean[],
    marginDelta: AmountInfo[],
    existingPos: PositionInfo[],
    opts?: ApiOpts | undefined
  ): Promise<PreviewInfo[]> {
    throw new Error('Method not implemented.')
  }
  getTotalClaimableFunding(wallet: string, opts?: ApiOpts | undefined): Promise<FixedNumber> {
    throw new Error('Method not implemented.')
  }
  getTotalAccuredFunding(wallet: string, opts?: ApiOpts | undefined): Promise<FixedNumber> {
    throw new Error('Method not implemented.')
  }

  async getAccountInfo(wallet: string, opts?: ApiOpts): Promise<AccountInfo[]> {
    const clearinghouseState = await getClearinghouseState(wallet)

    const crossAccountValue = FixedNumber.fromString(clearinghouseState.crossMarginSummary.accountValue)
    const crossTotalNtlPos = FixedNumber.fromString(clearinghouseState.crossMarginSummary.totalNtlPos)

    const accountInfo: AccountInfo = {
      protocolId: 'HL',
      accountEquity: FixedNumber.fromString(clearinghouseState.marginSummary.accountValue),
      totalMarginUsed: FixedNumber.fromString(clearinghouseState.marginSummary.totalMarginUsed),
      maintainenceMargin: FixedNumber.fromString(clearinghouseState.crossMaintenanceMarginUsed),
      withdrawable: FixedNumber.fromString(clearinghouseState.withdrawable),
      availableToTrade: FixedNumber.fromString(clearinghouseState.withdrawable),
      crossAccountLeverage: crossAccountValue.isZero()
        ? FixedNumber.fromString('0')
        : divFN(crossTotalNtlPos, crossAccountValue)
    }

    return [accountInfo]
  }

  getAmountInfoType(): AmountInfoInToken {
    return {
      sizeDeltaInToken: false,
      collateralDeltaInToken: true
    }
  }

  async _populateMeta(opts?: ApiOpts) {
    let sTimeMarkets = getStaleTime(CACHE_DAY, opts)
    await cacheFetch({
      key: [HL_CACHE_PREFIX, 'meta'],
      fn: () => getMeta(),
      staleTime: sTimeMarkets,
      cacheTime: sTimeMarkets * CACHE_TIME_MULT,
      opts: opts
    })
  }

  getAmountInfoType(): AmountInfoInToken {
    return {
      sizeDeltaInToken: false,
      collateralDeltaInToken: true
    }
  }
}
