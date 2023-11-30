import { BigNumber, UnsignedTransaction, ethers } from 'ethers'
import { getAddress, parseUnits } from 'ethers-v6'
import { CACHE_SECOND, CACHE_TIME_MULT, GMXV1_CACHE_PREFIX, cacheFetch, getStaleTime } from '../../src/common/cache'
import { ZERO } from '../../src/common/constants'
import { FixedNumber } from '../../src/common/fixedNumber'
import { getPaginatedResponse, toAmountInfo, validDenomination } from '../../src/common/helper'
import { decodeMarketId, encodeMarketId } from '../../src/common/markets'
import { rpc } from '../../src/common/provider'
import {
  Token,
  getTokenBySymbol as getTokenBySymbolCommon,
  getTokenByAddress as getTokenByAddressCommon
} from '../../src/common/tokens'
import { ARBITRUM, getConstant } from '../../src/configs/gmx/chains'
import { getContract } from '../../src/configs/gmx/contracts'
import {
  MIN_ORDER_USD,
  V1_TOKENS,
  bigNumberify,
  getCloseTradePreviewInternalV1,
  getEditCollateralPreviewInternalV1,
  getLiquidationPrice,
  getPositionQuery,
  getPositions,
  getServerBaseUrl,
  getServerUrl,
  getToken,
  getTokenBySymbol,
  getTradePreviewInternalV1,
  getWhitelistedTokens,
  useInfoTokens
} from '../../src/configs/gmx/tokens'
import { IAdapterV1 } from '../../src/interfaces/V1/IAdapterV1'
import {
  AmountInfo,
  ApiOpts,
  CancelOrder,
  ClaimInfo,
  ClosePositionData,
  CloseTradePreviewInfo,
  CollateralData,
  CreateOrder,
  DynamicMarketMetadata,
  GenericStaticMarketMetadata,
  HistoricalTradeInfo,
  IdleMarginInfo,
  LiquidationInfo,
  Market,
  MarketInfo,
  OpenTradePreviewInfo,
  OrderData,
  OrderIdentifier,
  OrderInfo,
  OrderType,
  PageOptions,
  PaginatedRes,
  PositionInfo,
  PreviewInfo,
  Protocol,
  ProtocolId,
  UnsignedTxWithMetadata,
  UpdateOrder,
  UpdatePositionMarginData
} from '../../src/interfaces/V1/IRouterAdapterBaseV1'
import { IERC20__factory, OrderBookReader__factory, OrderBook__factory, Reader__factory } from '../../typechain/gmx-v1'
import { Chain } from 'viem'
import { arbitrum, optimism } from 'viem/chains'

const GMX_V1_PROTOCOL_ID = 'GMXV1'

// taken from contract Vault.sol
const LIQUIDATION_FEE_USD = BigNumber.from('5000000000000000000000000000000')

export default class GmxV1Adapter implements IAdapterV1 {
  private provider = rpc[42161]

  private minCollateralUsd = parseUnits('11', 30)
  private EXECUTION_FEE = getConstant(ARBITRUM, 'DECREASE_ORDER_EXECUTION_GAS_FEE')! as BigNumber

  init(swAddr: string, opts?: ApiOpts | undefined): Promise<void> {
    throw new Error('Method not implemented.')
  }

  setup(): Promise<UnsignedTxWithMetadata[]> {
    throw new Error('Method not implemented.')
  }

  supportedChains(): Chain[] {
    return [arbitrum]
  }

  async supportedMarkets(chains: Chain[] | undefined, opts?: ApiOpts | undefined): Promise<MarketInfo[]> {
    const marketsInfo: MarketInfo[] = []

    this._getIndexTokens().forEach((it) => {
      const market: Market = {
        marketId: encodeMarketId(arbitrum.id.toString(), GMX_V1_PROTOCOL_ID, it.address[arbitrum.id]!),
        chain: arbitrum,
        indexToken: it,
        longCollateral: this._getCollateralTokens(),
        shortCollateral: this._getCollateralTokens(),
        supportedOrderTypes: {
          LIMIT: true,
          MARKET: true,
          STOP_LOSS: true,
          TAKE_PROFIT: true
        },
        supportedOrderActions: {
          CREATE: true,
          UPDATE: true,
          CANCEL: true
        },
        marketSymbol: this._getMarketSymbol(it)
      }

      const staticMetadata: GenericStaticMarketMetadata = {
        maxLeverage: FixedNumber.fromValue('500000', 4, 4),
        minLeverage: FixedNumber.fromValue('11000', 4, 4),
        minInitialMargin: FixedNumber.fromValue(this.minCollateralUsd.toString(), 30, 30),
        minPositionSize: FixedNumber.fromValue(MIN_ORDER_USD.toString(), 30, 30)
      }

      const protocol: Protocol = {
        protocolId: GMX_V1_PROTOCOL_ID
      }

      const marketInfo: MarketInfo = {
        ...market,
        ...staticMetadata,
        ...protocol
      }

      marketsInfo.push(marketInfo)
    })

    return Promise.resolve(marketsInfo)
  }

  async getMarketsInfo(marketIds: string[], opts?: ApiOpts | undefined): Promise<MarketInfo[]> {
    return (await this.supportedMarkets(this.supportedChains(), opts)).filter((m) => marketIds.includes(m.marketId))
  }

  async getMarketPrices(marketIds: string[], opts?: ApiOpts | undefined): Promise<FixedNumber[]> {
    const priceRes = await this._getOraclePrices()

    return marketIds.map((marketId) => {
      const indexTokenAddress = decodeMarketId(marketId).protocolMarketId
      const price = priceRes[indexTokenAddress]
      return FixedNumber.fromValue(price.toString(), 30, 30)
    })
  }

  async getDynamicMarketMetadata(marketIds: string[], opts?: ApiOpts | undefined): Promise<DynamicMarketMetadata[]> {
    const metadata: DynamicMarketMetadata[] = []

    const reader = Reader__factory.connect(getContract(ARBITRUM, 'Reader')!, this.provider)

    const nativeTokenAddress = getContract(ARBITRUM, 'NATIVE_TOKEN')
    const whitelistedTokens = V1_TOKENS[ARBITRUM]
    const tokenAddresses = whitelistedTokens.map((x) => x.address)

    const sTimeFI = getStaleTime(CACHE_SECOND * 30, opts)
    const fundingRateInfo = await cacheFetch({
      key: [GMXV1_CACHE_PREFIX, 'fundingRateInfo'],
      fn: () => reader.getFundingRates(getContract(ARBITRUM, 'Vault')!, nativeTokenAddress!, tokenAddresses),
      staleTime: sTimeFI,
      cacheTime: sTimeFI * CACHE_TIME_MULT,
      opts
    })

    const { infoTokens } = await useInfoTokens(this.provider, ARBITRUM, false, [BigNumber.from(0)], fundingRateInfo)
    const markets = await this.getMarketsInfo(marketIds, opts)

    // short token is same across all markets
    const shortTokenInfo = infoTokens[getTokenBySymbol(ARBITRUM, 'USDC.e')!.address]

    for (const market of markets) {
      const longTokenInfo = infoTokens[market.indexToken.address[arbitrum.id]!]

      const dynamicMetadata: DynamicMarketMetadata = {
        oiLong: FixedNumber.fromValue(longTokenInfo.guaranteedUsd!.toString(), 30, 30),
        oiShort: FixedNumber.fromValue(longTokenInfo.globalShortSize!.toString(), 30, 30),
        availableLiquidityLong: FixedNumber.fromValue(longTokenInfo.maxAvailableLong!.toString(), 30, 30),
        availableLiquidityShort: FixedNumber.fromValue(shortTokenInfo.maxAvailableShort!.toString(), 30, 30),
        longFundingRate: FixedNumber.fromValue(ZERO.toString(), 30, 30),
        shortFundingRate: FixedNumber.fromValue(ZERO.toString(), 30, 30),
        longBorrowRate: FixedNumber.fromValue(longTokenInfo.fundingRate!.toString(), 30, 30),
        shortBorrowRate: FixedNumber.fromValue(shortTokenInfo.fundingRate!.toString(), 30, 30)
      }

      metadata.push(dynamicMetadata)
    }

    return metadata
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

  getIdleMargins(wallet: string, opts?: ApiOpts | undefined): Promise<IdleMarginInfo[]> {
    return Promise.resolve([])
  }

  async getAllPositions(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<PositionInfo>> {
    const reader = Reader__factory.connect(getContract(ARBITRUM, 'Reader')!, this.provider)

    const nativeTokenAddress = getContract(ARBITRUM, 'NATIVE_TOKEN')

    const whitelistedTokens = V1_TOKENS[ARBITRUM]
    const tokenAddresses = whitelistedTokens.map((x) => x.address)

    const positionQuery = getPositionQuery(
      whitelistedTokens as {
        address: string
        isStable: boolean
        isWrapped: boolean
      }[],
      nativeTokenAddress!
    )

    // console.log(positionQuery)

    const positionDataPromise = reader.getPositions(
      getContract(ARBITRUM, 'Vault')!,
      wallet,
      positionQuery.collateralTokens,
      positionQuery.indexTokens,
      positionQuery.isLong
    )

    const tokenBalancesPromise = reader.getTokenBalances(wallet, tokenAddresses)

    // console.log(tokenBalances)

    const fundingRateInfoPromise = reader.getFundingRates(
      getContract(ARBITRUM, 'Vault')!,
      nativeTokenAddress!,
      tokenAddresses
    )

    // console.log(fundingRateInfo)

    const [positionData, tokenBalances, fundingRateInfo] = await Promise.all([
      positionDataPromise,
      tokenBalancesPromise,
      fundingRateInfoPromise
    ])

    const { infoTokens } = await useInfoTokens(
      this.provider,
      ARBITRUM,
      false,
      tokenBalances,
      fundingRateInfo,
      undefined,
      opts
    )

    // console.log(infoTokens)

    const { positions, positionsMap } = getPositions(
      ARBITRUM,
      positionQuery,
      positionData,
      infoTokens,
      false,
      true,
      getAddress(wallet),
      undefined,
      undefined
    )

    let positionsInfo: PositionInfo[] = []

    for (const pos of positions) {
      const accessibleMargin: BigNumber = pos.collateralAfterFee.sub(MIN_ORDER_USD).gt(0)
        ? pos.collateralAfterFee.sub(MIN_ORDER_USD)
        : bigNumberify(0)
      const liqPrice = getLiquidationPrice({
        size: pos.size,
        collateral: pos.collateral,
        averagePrice: pos.averagePrice,
        isLong: pos.isLong,
        fundingFee: pos.fundingFee
      })

      const collateralToken = getTokenBySymbolCommon(pos.collateralToken.symbol)
      const indexToken = getTokenBySymbolCommon(pos.indexToken.symbol)

      const pi: PositionInfo = {
        marketId: encodeMarketId(
          arbitrum.id.toString(),
          GMX_V1_PROTOCOL_ID,
          this.getIndexTokenAddressFromPositionKey(pos.key)
        ),
        posId: pos.key,
        size: toAmountInfo(pos.size, 30, false),
        margin: toAmountInfo(pos.collateral, 30, false),
        accessibleMargin: toAmountInfo(accessibleMargin.gt('0') ? accessibleMargin : ZERO, 30, false),
        avgEntryPrice: FixedNumber.fromValue(pos.averagePrice.toString(), 30, 30),
        cumulativeFunding: FixedNumber.fromValue(pos.fundingFee.toString(), 30, 30),
        unrealizedPnl: FixedNumber.fromValue(
          (pos.hasProfitAfterFees ? pos.pendingDeltaAfterFees : pos.pendingDeltaAfterFees.mul(-1)).toString(),
          30,
          30
        ),
        liquidationPrice: liqPrice ? FixedNumber.fromValue(liqPrice.toString(), 30, 30) : FixedNumber.fromValue('0'),
        leverage: FixedNumber.fromValue(pos.leverage!.toString(), 4, 4),
        direction: pos.isLong ? 'LONG' : 'SHORT',
        collateral: collateralToken,
        indexToken: indexToken,
        protocolId: GMX_V1_PROTOCOL_ID,
        metadata: pos
      }

      positionsInfo.push(pi)
    }

    return getPaginatedResponse(positionsInfo, pageOptions)
  }

  async getAllOrders(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<OrderInfo>> {
    const ordersInfo: OrderInfo[] = []

    const orders = await this._getAccountOrders(wallet, this.provider)
    orders.forEach((order) => {
      let isIncrease = order.type == 'Increase'
      let collateralToken: Token
      let collateralAmount: BigNumber
      if (isIncrease) {
        collateralToken = getTokenByAddressCommon(order.purchaseToken)
        collateralAmount = order.purchaseTokenAmount as BigNumber
      } else {
        collateralToken = getTokenByAddressCommon(order.collateralToken)
        collateralAmount = order.collateralDelta as BigNumber
      }

      let isTp = false
      let triggerType
      if (!isIncrease) {
        if (order.isLong) {
          isTp = order.triggerAboveThreshold as boolean
        } else {
          isTp = !order.triggerAboveThreshold as boolean
        }
        triggerType = isTp ? 'TAKE_PROFIT' : 'STOP_LOSS'
      } else {
        triggerType = 'NONE'
      }

      const oData: OrderData = {
        marketId: encodeMarketId(arbitrum.id.toString(), GMX_V1_PROTOCOL_ID, order.indexToken),
        direction: order.isLong ? 'LONG' : 'SHORT',
        sizeDelta: toAmountInfo(order.sizeDelta, 30, false),
        marginDelta: toAmountInfo(collateralAmount, collateralToken.decimals, true), //TODO: check
        triggerData: {
          triggerPrice: FixedNumber.fromValue(order.triggerPrice.toString(), 30, 30),
          triggerAboveThreshold: order.triggerAboveThreshold as boolean
        }
      }
      const oId: OrderIdentifier = {
        orderId: String(order.index),
        marketId: encodeMarketId(arbitrum.id.toString(), GMX_V1_PROTOCOL_ID, order.indexToken)
      }
      const oType = {
        orderType: this._getOrderType(order.type, triggerType)
      }
      const oCollateralData: CollateralData = {
        collateral: collateralToken
      }
      const oProtocolId = {
        protocolId: GMX_V1_PROTOCOL_ID as ProtocolId
      }
      const orderInfo: OrderInfo = {
        ...oData,
        ...oId,
        ...oType,
        ...oCollateralData,
        ...oProtocolId
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
        if (this._isOrderForPosition(o, p)) {
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
    const results = await fetch('https://api.thegraph.com/subgraphs/name/nissoh/gmx-arbitrum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          trades(first: 1000, where: {account: "${wallet.toLowerCase()}"}, orderBy: timestamp, orderDirection: desc ) {
            id
            key
            fee
            size
            isLong
            account
            sizeDelta
            timestamp
            collateral
            indexToken
            realisedPnl
            averagePrice
            collateralToken
            status
            increaseList {
              id
              key
              account
              collateralDelta
              collateralToken
              fee
              indexToken
              isLong
              price
              sizeDelta
              timestamp
            }
            decreaseList {
              id
              key
              account
              collateralDelta
              collateralToken
              fee
              indexToken
              isLong
              price
              sizeDelta
              timestamp
            }
            updateList {
              id
              key
              realisedPnl
              averagePrice
              collateral
              entryFundingRate
              markPrice
              reserveAmount
              size
              timestamp
            }
            closedPosition {
              id
              key
              averagePrice
              collateral
              entryFundingRate
              realisedPnl
              reserveAmount
              size
              timestamp
            }
            liquidatedPosition {
              id
              key
              account
              collateral
              collateralToken
              indexToken
              isLong
              markPrice
              realisedPnl
              reserveAmount
              size
              timestamp
            }
          }
        }
      `
      })
    })

    const resultJson = await results.json()
    // console.dir({ resultJson }, { depth: 10 });
    // console.log(resultJson.data.trades.length)

    const tradesInfo: HistoricalTradeInfo[] = []

    for (const each of resultJson.data.trades) {
      const increaseList = each.increaseList
      const decreaseList = each.decreaseList
      const updateList = each.updateList
      const closedPosition = each.closedPosition

      if (!!increaseList) {
        for (const incTrade of increaseList) {
          if (BigNumber.from(incTrade.sizeDelta).eq(0)) continue // Add collateral trades

          let txHash = (incTrade.id as string).split(':')[2]
          let realisedPnl: BigNumber | undefined = undefined

          for (const update of updateList) {
            if ((update.id as string).split(':')[2] == txHash) {
              realisedPnl = BigNumber.from(update.realisedPnl)
              break
            }
          }

          tradesInfo.push({
            marketId: encodeMarketId(arbitrum.id.toString(), GMX_V1_PROTOCOL_ID, incTrade.indexToken),
            timestamp: incTrade.timestamp as number,
            indexPrice: FixedNumber.fromValue(BigNumber.from(incTrade.price).toString(), 30, 30),
            direction: incTrade.isLong ? 'LONG' : 'SHORT',
            sizeDelta: toAmountInfo(BigNumber.from(incTrade.sizeDelta), 30, false),
            marginDelta: toAmountInfo(BigNumber.from(incTrade.collateralDelta), 30, false),
            collateralPrice: incTrade.isLong
              ? FixedNumber.fromValue(BigNumber.from(incTrade.price).toString(), 30, 30)
              : FixedNumber.fromValue(parseUnits('1', 30).toString(), 30, 30), // TODO - get USDC price
            collateral: getTokenByAddressCommon(incTrade.collateralToken),
            realizedPnl: FixedNumber.fromValue(realisedPnl!.toString(), 30, 30),
            keeperFeesPaid: FixedNumber.fromValue('0', 30, 30),
            positionFee: FixedNumber.fromValue(BigNumber.from(incTrade.fee).toString(), 30, 30),
            operationType: incTrade.isLong ? 'Open Long' : 'Open Short',
            txHash: txHash
          })
        }
      }

      if (!!decreaseList) {
        for (const decTrade of decreaseList) {
          if (BigNumber.from(decTrade.sizeDelta).eq(0)) continue // Remove collateral trades

          let txHash = (decTrade.id as string).split(':')[2]
          let realisedPnl: BigNumber | undefined = undefined
          let collateralDelta = BigNumber.from(decTrade.collateralDelta)

          for (const update of updateList) {
            if ((update.id as string).split(':')[2] == txHash) {
              realisedPnl = BigNumber.from(update.realisedPnl)
              break
            }
          }
          if (!!closedPosition) {
            if ((closedPosition.id as string).split(':')[2] == txHash) {
              realisedPnl = BigNumber.from(closedPosition.realisedPnl)
              collateralDelta = BigNumber.from(each.collateral)
            }
          }

          tradesInfo.push({
            marketId: encodeMarketId(arbitrum.id.toString(), GMX_V1_PROTOCOL_ID, decTrade.indexToken),
            timestamp: decTrade.timestamp as number,
            indexPrice: FixedNumber.fromValue(BigNumber.from(decTrade.price).toString(), 30, 30),
            direction: decTrade.isLong ? 'LONG' : 'SHORT',
            sizeDelta: toAmountInfo(BigNumber.from(decTrade.sizeDelta), 30, false),
            marginDelta: toAmountInfo(BigNumber.from(collateralDelta), 30, false),
            collateralPrice: decTrade.isLong
              ? FixedNumber.fromValue(BigNumber.from(decTrade.price).toString(), 30, 30)
              : FixedNumber.fromValue(parseUnits('1', 30).toString(), 30, 30), // TODO - get USDC price
            collateral: getTokenByAddressCommon(decTrade.collateralToken),
            realizedPnl: FixedNumber.fromValue(realisedPnl!.toString(), 30, 30),
            keeperFeesPaid: FixedNumber.fromValue('0', 30, 30),
            positionFee: FixedNumber.fromValue(BigNumber.from(decTrade.fee).toString(), 30, 30),
            operationType: decTrade.isLong ? 'Close Long' : 'Close Short',
            txHash: txHash
          })
        }
      }
    }

    tradesInfo.sort((a, b) => {
      return b.timestamp - a.timestamp
    })

    if (tradesInfo.length > 0) {
      let from = new Date(tradesInfo[tradesInfo.length - 1].timestamp * 1000)
      from.setUTCHours(0, 0, 0, 0)
      const fromTS = from.getTime() / 1000

      let to = new Date(tradesInfo[0].timestamp * 1000)
      to.setUTCHours(24, 0, 0, 0)
      const toTS = to.getTime() / 1000

      try {
        type BenchmarkData = {
          t: number[]
          o: number[]
        }

        let pricesData: BenchmarkData

        const ethPriceUrl = `https://benchmarks.pyth.network/v1/shims/tradingview/history?symbol=Crypto.ETH/USD&resolution=D&from=${fromTS}&to=${toTS}`
        pricesData = await fetch(ethPriceUrl).then((d) => d.json())
        let priceMap = new Array<number>()

        for (const i in pricesData.t) {
          priceMap.push(pricesData.o[i])
        }
        // console.log("PriceMapLength: ", priceMap.length, "Price map: ", priceMap);

        for (const each of tradesInfo) {
          const ts = each.timestamp
          const days = Math.floor((ts - fromTS) / 86400)
          const etherPrice = ethers.utils.parseUnits(priceMap[days].toString(), 18)
          const PRECISION = BigNumber.from(10).pow(30)

          each.keeperFeesPaid = FixedNumber.fromValue(
            this.EXECUTION_FEE.mul(PRECISION)
              .mul(etherPrice)
              .div(ethers.constants.WeiPerEther)
              .div(ethers.constants.WeiPerEther)
              .toString(),
            30,
            30
          )
        }
      } catch (e) {
        console.log('<Gmx trade history> Error fetching price data: ', e)
      }
    }

    return getPaginatedResponse(tradesInfo, pageOptions)
  }

  async getLiquidationHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<LiquidationInfo>> {
    const results = await fetch('https://api.thegraph.com/subgraphs/name/gmx-io/gmx-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
            liquidatedPositions(where: {account: "${wallet.toLowerCase()}"}) {
              id
              loss
              size
              isLong
              markPrice
              borrowFee
              timestamp
              collateral
              indexToken
              averagePrice
              collateralToken
            }
          }
      `
      })
    })

    const resultJson = await results.json()

    const liquidationHistory: LiquidationInfo[] = []

    for (const each of resultJson.data.liquidatedPositions) {
      liquidationHistory.push({
        marketId: encodeMarketId(arbitrum.id.toString(), GMX_V1_PROTOCOL_ID, each.indexToken),
        timestamp: each.timestamp as number,
        liquidationPrice: FixedNumber.fromValue(each.markPrice, 30, 30),
        direction: each.isLong ? 'LONG' : 'SHORT',
        sizeClosed: toAmountInfo(each.size, 30, false),
        remainingCollateral: toAmountInfo(ZERO, 30, false),
        collateral: getTokenByAddressCommon(each.collateralToken),
        realizedPnl: FixedNumber.fromValue(BigNumber.from(each.collateral).mul(-1).toString(), 30, 30),
        liquidationFees: FixedNumber.fromValue(BigNumber.from(LIQUIDATION_FEE_USD).toString(), 30, 30), // USD
        liqudationLeverage: FixedNumber.fromValue('1000000', 4, 4), //100x
        txHash: '' // TODO - get tx hash
      })
    }

    liquidationHistory.sort((a, b) => {
      return b.timestamp - a.timestamp
    })

    return getPaginatedResponse(liquidationHistory, pageOptions)
  }

  getClaimHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<ClaimInfo>> {
    return Promise.resolve({ result: [], maxItemsCount: 0 })
  }

  async getOpenTradePreview(
    wallet: string,
    orderData: CreateOrder[],
    existingPos: (PositionInfo | undefined)[],
    opts?: ApiOpts | undefined
  ): Promise<OpenTradePreviewInfo[]> {
    const previews: OpenTradePreviewInfo[] = []

    const markets = await this.getMarketsInfo(
      orderData.map((o) => o.marketId),
      opts
    )

    for (let i = 0; i < orderData.length; i++) {
      if (!validDenomination(orderData[i].marginDelta, true)) throw new Error('Margin delta must be token denominated')
      if (!validDenomination(orderData[i].sizeDelta, false)) throw new Error('Size delta must be usd denominated')

      previews.push(await getTradePreviewInternalV1(orderData[i], existingPos[i], markets[i], this.EXECUTION_FEE, opts))
    }

    return previews
  }

  async getCloseTradePreview(
    wallet: string,
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[],
    opts?: ApiOpts | undefined
  ): Promise<CloseTradePreviewInfo[]> {
    const previews: CloseTradePreviewInfo[] = []

    for (let i = 0; i < positionInfo.length; i++) {
      if (!validDenomination(closePositionData[i].closeSize, true))
        throw new Error('Close size must be token denominated')
      previews.push(
        await getCloseTradePreviewInternalV1(positionInfo[i], closePositionData[i], this.EXECUTION_FEE, opts)
      )
    }

    return previews
  }

  async getUpdateMarginPreview(
    wallet: string,
    isDeposit: boolean[],
    marginDelta: AmountInfo[],
    existingPos: PositionInfo[],
    opts?: ApiOpts | undefined
  ): Promise<PreviewInfo[]> {
    const previews: PreviewInfo[] = []

    for (let i = 0; i < existingPos.length; i++) {
      if (!validDenomination(marginDelta[i], true)) throw new Error('Margin delta must be token denominated')

      previews.push(
        await getEditCollateralPreviewInternalV1(
          wallet,
          isDeposit[i],
          marginDelta[i],
          existingPos[i],
          this.EXECUTION_FEE,
          opts
        )
      )
    }

    return previews
  }

  getTotalClaimableFunding(wallet: string, opts?: ApiOpts | undefined): Promise<FixedNumber> {
    return Promise.resolve(FixedNumber.fromValue('0', 30, 30))
  }
  getTotalAccuredFunding(wallet: string, opts?: ApiOpts | undefined): Promise<FixedNumber> {
    return Promise.resolve(FixedNumber.fromValue('0', 30, 30))
  }

  ////////// GMX specific helper methods //////////

  private async _getAccountOrders(account: string, provider: ethers.providers.Provider) {
    const orderBookAddress = getContract(ARBITRUM, 'OrderBook')!
    const orderBookReaderAddress = getContract(ARBITRUM, 'OrderBookReader')!

    const orderBookContract = OrderBook__factory.connect(orderBookAddress, provider)
    const orderBookReaderContract = OrderBookReader__factory.connect(orderBookReaderAddress, provider)

    const fetchIndexesFromServer = async () => {
      const ordersIndexesUrl = `${getServerBaseUrl(ARBITRUM)}/orders_indices?account=${account}`
      try {
        const res = await fetch(ordersIndexesUrl)
        const json = await res.json()
        const ret: {
          [index: string]: Array<{
            _type: string
            val: string
          }>
        } = {}
        for (const key of Object.keys(json)) {
          ret[key.toLowerCase()] = json[key]
            .map((val: { value: string }) => parseInt(val.value))
            .sort((a: number, b: number) => a - b)
        }
        return ret
      } catch {
        return { swap: [], increase: [], decrease: [] }
      }
    }

    const fetchLastIndexes = async () => {
      const [increase, decrease] = await Promise.all([
        (await orderBookContract.increaseOrdersIndex(account)).toNumber(),
        (await orderBookContract.increaseOrdersIndex(account)).toNumber()
      ])

      return { increase, decrease }
    }

    const getRange = (to: number, from?: number) => {
      const LIMIT = 10
      const _indexes: number[] = []
      from = from || Math.max(to - LIMIT, 0)
      for (let i = to - 1; i >= from; i--) {
        _indexes.push(i)
      }
      return _indexes
    }

    const getIndexes = (knownIndexes: number[], lastIndex: number) => {
      if (knownIndexes.length === 0) {
        return getRange(lastIndex)
      }
      return [...knownIndexes, ...getRange(lastIndex, knownIndexes[knownIndexes.length - 1] + 1).sort((a, b) => b - a)]
    }

    const getIncreaseOrders = async (
      knownIndexes: number[],
      lastIndex: number,
      parseFunc: (arg1: [ethers.BigNumber[], string[]], arg2: string, arg3: number[]) => any[]
    ) => {
      const indexes = getIndexes(knownIndexes, lastIndex)
      const ordersData = await orderBookReaderContract.getIncreaseOrders(orderBookAddress, account, indexes)
      const orders = parseFunc(ordersData, account, indexes)

      return orders
    }

    const getDecreaseOrders = async (
      knownIndexes: number[],
      lastIndex: number,
      parseFunc: (arg1: [ethers.BigNumber[], string[]], arg2: string, arg3: number[]) => any[]
    ) => {
      const indexes = getIndexes(knownIndexes, lastIndex)
      const ordersData = await orderBookReaderContract.getDecreaseOrders(orderBookAddress, account, indexes)
      const orders = parseFunc(ordersData, account, indexes)

      return orders
    }

    function _parseOrdersData(
      ordersData: [ethers.BigNumber[], string[]],
      account: string,
      indexes: number[],
      extractor: any,
      uintPropsLength: number,
      addressPropsLength: number
    ) {
      if (!ordersData) {
        return []
      }
      const [uintProps, addressProps] = ordersData
      const count = uintProps.length / uintPropsLength

      const orders: any[] = []
      for (let i = 0; i < count; i++) {
        const sliced = addressProps
          .slice(addressPropsLength * i, addressPropsLength * (i + 1))
          .map((prop) => prop as any)
          .concat(uintProps.slice(uintPropsLength * i, uintPropsLength * (i + 1)))

        if (
          (sliced[0] as string) === ethers.constants.AddressZero &&
          (sliced[1] as string) === ethers.constants.AddressZero
        ) {
          continue
        }

        const order = extractor(sliced)
        order.index = indexes[i]
        order.account = account
        orders.push(order)
      }

      return orders
    }

    function parseDecreaseOrdersData(
      decreaseOrdersData: [ethers.BigNumber[], string[]],
      account: string,
      indexes: number[]
    ) {
      const extractor = (sliced: any[]) => {
        const isLong = sliced[4].toString() === '1'
        return {
          collateralToken: sliced[0] as string,
          indexToken: sliced[1] as string,
          collateralDelta: sliced[2] as BigNumber,
          sizeDelta: sliced[3] as BigNumber,
          isLong,
          triggerPrice: sliced[5] as BigNumber,
          triggerAboveThreshold: sliced[6].toString() === '1',
          type: 'Decrease'
        }
      }
      return _parseOrdersData(decreaseOrdersData, account, indexes, extractor, 5, 2)
    }

    function parseIncreaseOrdersData(
      increaseOrdersData: [ethers.BigNumber[], string[]],
      account: string,
      indexes: number[]
    ) {
      const extractor = (sliced: any[]) => {
        const isLong = sliced[5].toString() === '1'
        return {
          purchaseToken: sliced[0] as string,
          collateralToken: sliced[1] as string,
          indexToken: sliced[2] as string,
          purchaseTokenAmount: sliced[3] as BigNumber,
          sizeDelta: sliced[4] as BigNumber,
          isLong,
          triggerPrice: sliced[6] as BigNumber,
          triggerAboveThreshold: sliced[7].toString() === '1',
          type: 'Increase'
        }
      }
      return _parseOrdersData(increaseOrdersData, account, indexes, extractor, 5, 3)
    }

    const [serverIndexes, lastIndexes]: any = await Promise.all([fetchIndexesFromServer(), fetchLastIndexes()])
    const [increaseOrders = [], decreaseOrders = []] = await Promise.all([
      getIncreaseOrders(serverIndexes.increase, lastIndexes.increase, parseIncreaseOrdersData),
      getDecreaseOrders(serverIndexes.decrease, lastIndexes.decrease, parseDecreaseOrdersData)
    ])
    // increaseOrders.forEach((io: any) => {
    //   logObject("io", io);
    // });
    // decreaseOrders.forEach((dor: any) => {
    //   logObject("do", dor);
    // });

    return [...increaseOrders, ...decreaseOrders]
  }

  private _getOrderType(type: string, triggerType: string): OrderType {
    if (triggerType === 'STOP_LOSS' || triggerType === 'TAKE_PROFIT') {
      return triggerType as OrderType
    } else {
      return 'LIMIT'
    }
  }

  private _isOrderForPosition(order: OrderInfo, position: PositionInfo): boolean {
    return order.marketId === position.marketId && order.direction === position.direction
  }

  private _getIndexTokens(): Token[] {
    return getWhitelistedTokens(ARBITRUM)
      .filter((token) => !token.isStable && !token.isWrapped)
      .map((t) => {
        return {
          symbol: t.symbol,
          name: t.name,
          decimals: t.decimals,
          address: {
            [arbitrum.id]: t.address,
            [optimism.id]: undefined
          }
        } as Token
      })
  }

  private _getCollateralTokens(): Token[] {
    return getWhitelistedTokens(ARBITRUM)
      .filter((token) => !token.isTempHidden)
      .map((t) => {
        return {
          symbol: t.symbol,
          name: t.name,
          decimals: t.decimals,
          address: {
            [arbitrum.id]: t.address,
            [optimism.id]: undefined
          }
        } as Token
      })
  }

  private _getMarketSymbol(token: Token): string {
    return token.symbol === 'WETH' ? 'ETH' : token.symbol
  }

  private async _getOraclePrices(): Promise<{ [key: string]: string }> {
    const indexPricesUrl = getServerUrl(ARBITRUM, '/prices')
    const pricesRes = await fetch(indexPricesUrl)
    const resJson = (await pricesRes.json()) as { [key: string]: string }

    return resJson
  }

  private getIndexTokenAddressFromPositionKey(positionKey: string): string {
    return positionKey.split(':')[2]
  }

  private getCollateralTokenAddressFromPositionKey(positionKey: string): string {
    return positionKey.split(':')[1]
  }
}
