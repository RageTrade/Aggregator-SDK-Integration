import { Chain } from 'viem'
import { FixedNumber, abs, addFN, divFN, mulFN } from '../common/fixedNumber'
import { IAdapterV1 } from '../interfaces/V1/IAdapterV1'
import {
  ApiOpts,
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
  TradeData,
  TriggerData,
  OrderType,
  AccountInfo,
  AmountInfoInToken,
  MarketState,
  TradeOperationType,
  CollateralData
} from '../interfaces/V1/IRouterAdapterBaseV1'
import { CACHE_DAY, CACHE_SECOND, CACHE_TIME_MULT, cacheFetch, getStaleTime, HL_CACHE_PREFIX } from '../common/cache'
import {
  HL_COLLATERAL_TOKEN,
  HL_TOKENS_MAP,
  approveAgent,
  cancelOrders,
  checkIfRageTradeAgent,
  cmpSide,
  getActiveAssetData,
  getAllMids,
  getClearinghouseState,
  getL2Book,
  getMeta,
  getMetaAndAssetCtxs,
  getOpenOrders,
  getOrderStatus,
  getUserFills,
  modifyOrders,
  placeOrders,
  roundedPrice,
  roundedSize,
  slippagePrice,
  updateIsolatedMargin,
  updateLeverage,
  withdrawFromBridge
} from '../configs/hyperliquid/api/client'
import {
  AssetCtx,
  AssetPosition,
  CancelRequest,
  L2Book,
  Meta,
  MetaAndAssetCtx,
  ModifyRequest,
  OpenOrders,
  OrderRequest,
  OrderStatusInfo
} from '../configs/hyperliquid/api/types'
import { encodeMarketId } from '../common/markets'
import { hyperliquid, HL_MAKER_FEE_BPS } from '../configs/hyperliquid/api/config'
import { parseUnits } from 'ethers/lib/utils'
import { indexBasisSlippage, populateTrigger } from '../configs/hyperliquid/helper'
import { getPaginatedResponse, toAmountInfo, toAmountInfoFN, validDenomination } from '../common/helper'
import { Token, tokens } from '../common/tokens'
import { ActionParam } from '../interfaces/IActionExecutor'
import { IERC20__factory } from '../../typechain/gmx-v2'
import { ARBITRUM } from '../configs/gmx/chains'
import { rpc } from '../common/provider'
import { BigNumber, ethers } from 'ethers'
import { estLiqPrice } from '../configs/hyperliquid/liqPrice'
import { TraverseResult, traverseHLBook } from '../configs/hyperliquid/obTraversal'

export default class HyperliquidAdapterV1 implements IAdapterV1 {
  private minCollateralUsd = parseUnits('11', 30)
  private minPositionUsd = parseUnits('11', 30)

  private provider = rpc[42161]
  public usdc = IERC20__factory.connect(tokens.USDC.address[ARBITRUM], this.provider)

  private BRIDGE2 = ethers.utils.getAddress('0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7')

  async init(swAddr: string, opts?: ApiOpts | undefined): Promise<void> {
    await cacheFetch({
      key: [HL_CACHE_PREFIX, 'meta'],
      fn: () => getMeta(),
      staleTime: 0,
      cacheTime: 0,
      opts: opts
    })
  }

  setup(): Promise<ActionParam[]> {
    return Promise.resolve([])
  }

  async deposit(token: Token, amount: FixedNumber): Promise<ActionParam[]> {
    if (token.symbol !== 'USDC') throw new Error('token not supported')

    const tx = await this.usdc.populateTransaction.transfer(this.BRIDGE2, amount.toFormat(6).value)

    const txs: ActionParam[] = [
      {
        tx,
        desc: 'Depositing into hyperliquid DEX',
        chainId: ARBITRUM,
        isUserAction: true,
        isAgentRequired: false,
        heading: 'hyperliquid',
        ethRequired: BigNumber.from(0)
      }
    ]

    return txs
  }

  async withdraw(token: Token, amount: FixedNumber, _: string): Promise<ActionParam[]> {
    if (token.symbol !== 'USDC') throw new Error('token not supported')

    return [await withdrawFromBridge(amount.toString())]
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
          TAKE_PROFIT_LIMIT: true
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

  async increasePosition(orderData: CreateOrder[], wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    const payload: ActionParam[] = []

    // check if agent is available, if not, create agent
    if (!(await checkIfRageTradeAgent(wallet))) payload.push(await approveAgent())

    // TODO: cache this
    const [meta, mids] = await Promise.all([getMeta(), getAllMids()])

    for (const each of orderData) {
      // check if selected token is USDC
      if (each.collateral.symbol !== HL_COLLATERAL_TOKEN.symbol) throw new Error('token not supported')

      // ensure size delta is in token terms
      if (!each.sizeDelta.isTokenAmount) throw new Error('size delta required in token terms')

      // get market info
      const marketInfo = (await this.getMarketsInfo([each.marketId]))[0]

      const coin = marketInfo.indexToken.symbol
      // TODO: check if we should manddate passing mode
      const mode = each.mode || 'ISOLATED'

      const isBuy = each.direction === 'LONG'
      const slippage = each.slippage ? each.slippage / 100 : 0.01

      // get position of given market (if any)
      const position = (await this.getAllPositions(wallet, undefined)).result.find((p) => p.marketId === each.marketId)

      const price = Number(mids[marketInfo.indexToken.symbol])

      // calculate leverage using sizeDelta and marginDelta
      let sizeDelta = Number(each.sizeDelta.amount._value)
      sizeDelta = roundedSize(sizeDelta, meta.universe.find((u) => u.name === coin)!.szDecimals)

      // TODO: check if we need to use limit price specified instead of mid price
      const sizeDeltaNotional = sizeDelta * price

      const marginDeltaNotional = Number(each.marginDelta.amount._value)

      // round towards closest int
      const reqdLeverage = Math.round(sizeDeltaNotional / marginDeltaNotional)
      const currentLeverage = Number(position?.leverage._value || 0)

      if (reqdLeverage > Number(marketInfo.maxLeverage._value) || reqdLeverage < Number(marketInfo.minLeverage))
        throw new Error(`calculated leverage ${reqdLeverage} is out of bounds`)

      if (reqdLeverage !== currentLeverage)
        payload.push(await updateLeverage(reqdLeverage, coin, mode === 'CROSS', meta))

      // populate trigger data if required
      let orderData: OrderRequest['order_type'] = { limit: { tif: 'Gtc' } }
      let limitPrice: OrderRequest['limit_px'] = 0

      if (each.type == 'MARKET') {
        limitPrice = roundedPrice(slippagePrice(isBuy, slippage, price))
      } else {
        if (!each.triggerData) throw new Error('trigger data required for limit increase')
        limitPrice = roundedPrice(Number(each.triggerData.triggerPrice._value))
      }

      const request: OrderRequest = {
        coin: coin,
        cloid: null,
        is_buy: isBuy,
        sz: sizeDelta,
        reduce_only: false,
        limit_px: limitPrice,
        order_type: orderData
      }

      payload.push(await placeOrders([request], meta))
    }

    return payload
  }

  async updateOrder(orderData: UpdateOrder[], wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    const payload: ActionParam[] = []

    const modifiedOrders: ModifyRequest[] = []

    // cannot update:
    // - market
    // - side
    // - mode (whatever is in set on account time of exeuction)
    // - leverage / margin (whatever is in set on account time of exeuction)
    // can update:
    // - size delta
    // - trigger data

    // check if agent is available, if not, create agent
    if (!(await checkIfRageTradeAgent(wallet))) payload.push(await approveAgent())

    const meta = await getMeta()
    const mids = await getAllMids()

    for (const each of orderData) {
      // ensure size delta is in token terms
      if (!each.sizeDelta.isTokenAmount) throw new Error('size delta required in token terms')

      // ensure trigger data is present
      if (!each.triggerData) throw new Error('trigger data required but not present')

      // get market info
      const marketInfo = (await this.getMarketsInfo([each.marketId]))[0]

      // retrive original order
      const order = (await getOpenOrders(wallet)).find((o) => o.oid === Number(each.orderId))
      const coin = marketInfo.indexToken.symbol

      if (!order) throw new Error('no open order for given identifier')

      if (order.coin !== marketInfo.indexToken.symbol) throw new Error('cannot update market on exisiting order')

      if (!cmpSide(order.side, each.direction)) throw new Error('cannot update direction on exisiting order')

      const price = Number(mids[marketInfo.indexToken.symbol])
      const isBuy = order.side === 'B'

      // TODO: check if we should enforce margin delta as zero here

      // calculate leverage using sizeDelta and marginDelta
      let sizeDelta = Number(each.sizeDelta.amount._value)
      sizeDelta = roundedSize(sizeDelta, meta.universe.find((u) => u.name === coin)!.szDecimals)

      // populate trigger data if required
      let orderData: ModifyRequest['order']['order_type'] = { limit: { tif: 'Gtc' } }
      let limitPrice: ModifyRequest['order']['limit_px'] = 0

      if (each.triggerData.triggerLimitPrice) {
        // covers following handling:
        // - stop limit and stop market (and therefore TP / SL market & limit)
        ;({ orderData, limitPrice } = populateTrigger(isBuy, price, each.orderType, each.triggerData))
      } else {
        // covers following handling:
        // - basic limit order which executes at specified price
        orderData = { limit: { tif: 'Gtc' } }
        limitPrice = roundedPrice(Number(each.triggerData.triggerPrice._value))
      }

      const request: OrderRequest = {
        coin: coin,
        cloid: null,
        is_buy: isBuy,
        sz: sizeDelta,
        reduce_only: order.reduceOnly || false,
        limit_px: limitPrice,
        order_type: orderData
      }

      modifiedOrders.push({ order: request, oid: order.oid })
    }

    payload.push(await modifyOrders(modifiedOrders, meta))

    return payload
  }

  async cancelOrder(orderData: CancelOrder[], wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    const payload: ActionParam[] = []

    const cancelledOrders: CancelRequest[] = []

    // check if agent is available, if not, create agent
    if (!(await checkIfRageTradeAgent(wallet))) payload.push(await approveAgent())

    const meta = await getMeta()

    for (const each of orderData) {
      // get market info
      const marketInfo = (await this.getMarketsInfo([each.marketId]))[0]

      // retrive original order
      const order = (await getOpenOrders(wallet)).find((o) => o.oid === Number(each.orderId))
      const coin = marketInfo.indexToken.symbol

      if (!order) throw new Error('order not found for cancelling')
      if (order.coin !== coin) throw new Error('invalid market for cancelling order')

      // get order status
      const status = await getOrderStatus(wallet, order.oid)

      // other order status are canceled, triggered and filled
      if (status.order.status !== 'open') throw new Error(`cannot modify ${status.status} order`)

      const cancel: CancelRequest = {
        coin: coin,
        oid: order.oid
      }

      cancelledOrders.push(cancel)
    }

    payload.push(await cancelOrders(cancelledOrders, meta))

    return payload
  }

  async closePosition(
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[],
    wallet: string,
    opts?: ApiOpts | undefined
  ): Promise<ActionParam[]> {
    const payload: ActionParam[] = []

    const requests: OrderRequest[] = []

    // check if agent is available, if not, create agent
    if (!(await checkIfRageTradeAgent(wallet))) payload.push(await approveAgent())

    const [meta, mids] = await Promise.all([getMeta(), getAllMids()])

    if (positionInfo.length !== closePositionData.length) throw new Error('length mismatch')

    for (let i = 0; i < positionInfo.length; ++i) {
      const closeData = closePositionData[i]
      const positionInfoData = positionInfo[i]

      if (closeData.outputCollateral && closeData.outputCollateral.symbol !== HL_COLLATERAL_TOKEN.symbol)
        throw new Error('token not supported')

      // ensure size delta is in token terms
      if (!closeData.closeSize.isTokenAmount) throw new Error('size delta required in token terms')

      // get market info
      const marketInfo = (await this.getMarketsInfo([positionInfoData.marketId]))[0]
      const coin = marketInfo.indexToken.symbol

      let sizeDelta = Number(closeData.closeSize.amount._value)
      sizeDelta = roundedSize(sizeDelta, meta.universe.find((u) => u.name === coin)!.szDecimals)

      const price = Number(mids[marketInfo.indexToken.symbol])
      const isBuy = positionInfoData.direction === 'SHORT'

      // TODO: close position doesn't take custom slippage in interface
      const slippage = 0.01

      if (closeData.type == 'MARKET') {
        requests.push({
          coin: coin,
          cloid: null,
          is_buy: isBuy,
          sz: sizeDelta,
          reduce_only: true,
          limit_px: roundedPrice(slippagePrice(isBuy, slippage, price)),
          order_type: {
            limit: {
              tif: 'Gtc'
            }
          }
        })
        continue
      }

      if (!closeData.triggerData) throw new Error('trigger data required')

      const { orderData, limitPrice } = populateTrigger(isBuy, price, closeData.type, closeData.triggerData)

      requests.push({
        coin: coin,
        cloid: null,
        is_buy: isBuy,
        sz: sizeDelta,
        reduce_only: true,
        limit_px: limitPrice,
        order_type: orderData
      })
    }

    payload.push(await placeOrders(requests, meta))

    return payload
  }

  async updatePositionMargin(
    positionInfo: PositionInfo[],
    updatePositionMarginData: UpdatePositionMarginData[],
    wallet: string,
    opts?: ApiOpts | undefined
  ): Promise<ActionParam[]> {
    // throw for cross
    // for isolated, check if position exists and add collateral

    const payload: ActionParam[] = []

    // check if agent is available, if not, create agent
    if (!(await checkIfRageTradeAgent(wallet))) payload.push(await approveAgent())

    const meta = await getMeta()

    if (positionInfo.length !== updatePositionMarginData.length) throw new Error('length mismatch')

    for (let i = 0; i < positionInfo.length; ++i) {
      const positionInfoData = positionInfo[i]
      const updateMarginData = updatePositionMarginData[i]

      // get market info
      const marketInfo = (await this.getMarketsInfo([positionInfoData.marketId]))[0]

      // compare mode
      if (!positionInfoData.mode || positionInfoData.mode === 'CROSS') throw new Error('invalid mode to update margin')

      if (!updateMarginData.margin.isTokenAmount) throw new Error('should be tokenAmount for margin')

      if (updateMarginData.collateral.symbol !== HL_COLLATERAL_TOKEN.symbol)
        throw new Error('should be tokenAmount for margin')

      const coin = marketInfo.indexToken.symbol

      const amountInt = updateMarginData.isDeposit
        ? Number(updateMarginData.margin.amount._value)
        : -1 * Number(updateMarginData.margin.amount._value)

      payload.push(await updateIsolatedMargin(amountInt, coin, meta))
    }

    return payload
  }

  claimFunding(wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
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
      if (status.orderType == 'Limit') {
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
      let triggerLimitPrice = undefined
      if (status.orderType == 'Stop Limit' || status.orderType == 'Take Profit Limit') {
        triggerLimitPrice = FixedNumber.fromString(status.limitPx)
      }
      const triggerData: TriggerData = {
        triggerPrice,
        triggerAboveThreshold,
        triggerLimitPrice
      }

      let orderType: OrderType

      switch (status.orderType) {
        case 'Limit':
          orderType = 'LIMIT'
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
      sizeDeltaInToken: true,
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
}
