import { Chain } from 'viem'
import { FixedNumber, abs, bipsDiff } from '../common/fixedNumber'
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
  AccountInfo
} from '../interfaces/V1/IRouterAdapterBaseV1'
import { CACHE_DAY, CACHE_SECOND, CACHE_TIME_MULT, cacheFetch, getStaleTime } from '../common/cache'
import {
  HL_COLLATERAL_TOKEN,
  HL_TOKENS_MAP,
  getAllMids,
  getClearinghouseState,
  getL2Book,
  getMeta,
  getMetaAndAssetCtxs,
  getOpenOrders,
  getOrderStatus
} from '../configs/hyperliquid/api/client'
import {
  AssetCtx,
  AssetPosition,
  HlOrderType,
  L2Book,
  Meta,
  MetaAndAssetCtx,
  OpenOrders,
  OrderStatusInfo
} from '../configs/hyperliquid/api/types'
import { encodeMarketId } from '../common/markets'
import { arbitrum } from 'viem/chains'
import { hyperliquid } from '../configs/hyperliquid/api/config'
import { parseUnits } from 'ethers/lib/utils'
import { indexBasisSlippage } from '../configs/hyperliquid/helper'
import { getPaginatedResponse, toAmountInfo, toAmountInfoFN } from '../common/helper'
import { LIMIT } from '../configs/gmx/tokens'

export default class HyperliquidAdapterV1 implements IAdapterV1 {
  private minCollateralUsd = parseUnits('11', 30)
  private minPositionUsd = parseUnits('11', 30)

  async init(swAddr: string, opts?: ApiOpts | undefined): Promise<void> {
    await getMeta()
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
      key: ['hl', 'meta'],
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
      key: ['hl', 'metaAndAssetCtxs'],
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
          key: ['hl', 'l2Book', c, nSigFigs],
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

  increasePosition(orderData: CreateOrder[], opts?: ApiOpts | undefined): Promise<UnsignedTxWithMetadata[]> {
    throw new Error('Method not implemented.')
  }
  updateOrder(orderData: UpdateOrder[], opts?: ApiOpts | undefined): Promise<UnsignedTxWithMetadata[]> {
    throw new Error('Method not implemented.')
  }
  cancelOrder(orderData: CancelOrder[], opts?: ApiOpts | undefined): Promise<UnsignedTxWithMetadata[]> {
    throw new Error('Method not implemented.')
  }
  closePosition(
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[],
    opts?: ApiOpts | undefined
  ): Promise<UnsignedTxWithMetadata[]> {
    throw new Error('Method not implemented.')
  }
  updatePositionMargin(
    positionInfo: PositionInfo[],
    updatePositionMarginData: UpdatePositionMarginData[],
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

    assetPositions.forEach((ap) => {
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
        metadata: ap
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
        pos: AssetPosition
      }
    > = {}
    orders.forEach((o) => {
      ordersMap[o.oid] = {
        order: o,
        status: ordersStatus.find((os) => os.order.order.oid === o.oid)!,
        pos: assetPositions.find((ap) => ap.position.coin === o.coin)!
      }
    })

    Object.entries(ordersMap).forEach(([oid, o]) => {
      const order = o.order
      const status = o.status.order.order
      const pos = o.pos
      const posSize = pos.position.szi

      const coin = order.coin
      const collateral = HL_COLLATERAL_TOKEN
      const orderSizeDelta = FixedNumber.fromString(order.sz)
      const sizeDelta = orderSizeDelta.isZero() ? FixedNumber.fromString(posSize) : orderSizeDelta

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

  getAllOrdersForPosition(
    wallet: string,
    positionInfo: PositionInfo[],
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<Record<string, PaginatedRes<OrderInfo>>> {
    throw new Error('Method not implemented.')
  }
  getTradesHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<HistoricalTradeInfo>> {
    throw new Error('Method not implemented.')
  }
  getLiquidationHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<LiquidationInfo>> {
    throw new Error('Method not implemented.')
  }
  getClaimHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<ClaimInfo>> {
    throw new Error('Method not implemented.')
  }
  getOpenTradePreview(
    wallet: string,
    orderData: CreateOrder[],
    existingPos: (PositionInfo | undefined)[],
    opts?: ApiOpts | undefined
  ): Promise<OpenTradePreviewInfo[]> {
    throw new Error('Method not implemented.')
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

  async getAccountInfo(wallet: string, opts?: ApiOpts): Promise<AccountInfo> {
    const clearinghouseState = await getClearinghouseState(wallet)

    const accountInfo: AccountInfo = {
      accountValue: FixedNumber.fromString(clearinghouseState.marginSummary.accountValue),
      totalMarginUsed: FixedNumber.fromString(clearinghouseState.marginSummary.totalMarginUsed),
      crossMaintenanceMarginUsed: FixedNumber.fromString(clearinghouseState.crossMaintenanceMarginUsed),
      withdrawable: FixedNumber.fromString(clearinghouseState.withdrawable)
    }

    return accountInfo
  }
}
