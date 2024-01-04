import { Chain } from 'viem'
import { FixedNumber } from '../common/fixedNumber'
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
  Protocol
} from '../interfaces/V1/IRouterAdapterBaseV1'
import { optimism, arbitrum } from 'viem/chains'
import KwentaSDK from '@kwenta/sdk'
import { rpc } from '../common/provider'
import { decodeMarketId, encodeMarketId } from '../common/markets'
import { Token, Maybe } from '../common/tokens'
import { FuturesMarket, FuturesMarketAsset, FuturesMarketKey } from '@kwenta/sdk/dist/types'
import { parseUnits } from 'ethers/lib/utils'
import { ZERO } from '../common/constants'
import {
  CACHE_DAY,
  CACHE_SECOND,
  CACHE_TIME_MULT,
  cacheFetch,
  getStaleTime,
  SYNV2_CACHE_PREFIX,
  CACHE_MINUTE
} from '../common/cache'
import { BigNumber } from 'ethers'
import Wei, { wei } from '@synthetixio/wei'
import { getBNFromFN, getEnumEntryByValue, toAmountInfo, validDenomination } from '../common/helper'
import { getTokenPriceD } from '../configs/pyth/prices'
import { PotentialTradeStatus } from '@kwenta/sdk/dist/types/futures'

const SYN_V2 = 'SYNTHETIXV2'
const sUSDAddr = '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9'
const sUsd: Token = {
  name: 'Synthetix USD',
  symbol: 'sUSD',
  decimals: 18,
  address: {
    [optimism.id]: sUSDAddr,
    [arbitrum.id]: undefined
  }
}
const D18 = 18

export default class SynthetixV2Adapter implements IAdapterV1 {
  private sdk: KwentaSDK = new KwentaSDK({
    networkId: 10,
    provider: rpc[10]
  })

  init(swAddr: string, opts?: ApiOpts | undefined): Promise<void> {
    return Promise.resolve()
  }

  setup(): Promise<UnsignedTxWithMetadata[]> {
    return Promise.resolve([])
  }

  supportedChains(opts?: ApiOpts | undefined): Chain[] {
    return [optimism]
  }

  async supportedMarkets(chains: Chain[] | undefined, opts?: ApiOpts | undefined): Promise<MarketInfo[]> {
    const marketsInfo: MarketInfo[] = []

    // get markets from sdk
    const sTimeM = getStaleTime(CACHE_DAY, opts)
    const markets = await cacheFetch({
      key: [SYNV2_CACHE_PREFIX, 'getProxiedMarkets'],
      fn: () => this.sdk.futures.getProxiedMarkets().then((m) => m.filter((m) => !m.isSuspended)),
      staleTime: sTimeM,
      cacheTime: sTimeM * CACHE_TIME_MULT,
      opts
    })

    // build MarketInfo
    markets.forEach((m: FuturesMarket) => {
      const market: Market = {
        marketId: encodeMarketId(optimism.id.toString(), SYN_V2, m.market!),
        chain: optimism,
        indexToken: this._getPartialToken(this._getTokenSymbol(m.asset!)), // TODO: convert to full token once we have index token list
        longCollateral: [sUsd],
        shortCollateral: [sUsd],
        supportedOrderTypes: {
          LIMIT: false,
          MARKET: true,
          STOP_LOSS: false,
          TAKE_PROFIT: false
        },
        supportedOrderActions: {
          CREATE: true,
          UPDATE: false,
          CANCEL: true
        },
        marketSymbol: this._getTokenSymbol(m.asset!),
        metadata: m
      }

      const staticMetadata: GenericStaticMarketMetadata = {
        maxLeverage: FixedNumber.fromValue(m.contractMaxLeverage!.toBN().toString(), D18, D18),
        minLeverage: FixedNumber.fromValue(parseUnits('1', D18).toString(), D18, D18),
        minInitialMargin: FixedNumber.fromValue(parseUnits('50', D18).toString(), D18, D18),
        minPositionSize: FixedNumber.fromValue(ZERO.toString(), D18, D18)
      }

      const protocol: Protocol = {
        protocolId: SYN_V2
      }

      const marketInfo: MarketInfo = {
        ...market,
        ...staticMetadata,
        ...protocol
      }

      marketsInfo.push(marketInfo)
    })

    return marketsInfo
  }

  async getMarketPrices(marketIds: string[], opts?: ApiOpts | undefined): Promise<FixedNumber[]> {
    const markets = await this.getMarketsInfo(marketIds, opts)

    return markets.map((m) => {
      const price = getTokenPriceD(m.indexToken.symbol, D18)!
      return FixedNumber.fromValue(price.toString(), D18, D18)
    })
  }

  async getMarketsInfo(marketIds: string[], opts?: ApiOpts | undefined): Promise<MarketInfo[]> {
    const result: MarketInfo[] = []
    const markets = await this.supportedMarkets(this.supportedChains(), opts)

    marketIds.forEach((marketId) => {
      const market = markets.find((m) => m.marketId == marketId)!
      result.push(market)
    })

    return result
  }

  async getDynamicMarketMetadata(marketIds: string[], opts?: ApiOpts | undefined): Promise<DynamicMarketMetadata[]> {
    const metadata: DynamicMarketMetadata[] = []

    // get markets info
    const markets = await this.getMarketsInfo(marketIds, opts)

    // get dynamic metadata from cache
    const sTimeDM = getStaleTime(CACHE_SECOND * 5, opts)
    const dynamicMetadataPromises = markets.map((m) =>
      cacheFetch({
        key: [SYNV2_CACHE_PREFIX, 'getMarket', m.marketId],
        fn: () => this.sdk.futures.getMarketMetadata(decodeMarketId(m.marketId).protocolMarketId),
        staleTime: sTimeDM,
        cacheTime: sTimeDM * CACHE_TIME_MULT,
        opts
      })
    )

    // build DynamicMarketMetadata
    const dynamicMetadata = await Promise.all(dynamicMetadataPromises)
    for (const futureMarket of dynamicMetadata) {
      const dynamicMetadata: DynamicMarketMetadata = {
        oiLong: FixedNumber.fromValue(futureMarket.openInterest.long.toBN().toString(), D18, D18),
        oiShort: FixedNumber.fromValue(futureMarket.openInterest.short.toBN().toString(), D18, D18),
        availableLiquidityLong: FixedNumber.fromValue(
          futureMarket.marketLimitUsd.sub(futureMarket.openInterest.longUSD).toBN().toString(),
          D18,
          D18
        ),
        availableLiquidityShort: FixedNumber.fromValue(
          futureMarket.marketLimitUsd.sub(futureMarket.openInterest.shortUSD).toBN().toString(),
          D18,
          D18
        ),
        longFundingRate: FixedNumber.fromValue(futureMarket.currentFundingRate.toBN().toString(), D18, D18),
        shortFundingRate: FixedNumber.fromValue(futureMarket.currentFundingRate.neg().toBN().toString(), D18, D18),
        longBorrowRate: FixedNumber.fromValue(ZERO.toString(), D18, D18),
        shortBorrowRate: FixedNumber.fromValue(ZERO.toString(), D18, D18)
      }

      metadata.push(dynamicMetadata)
    }

    return metadata
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
  getIdleMargins(wallet: string, opts?: ApiOpts | undefined): Promise<IdleMarginInfo[]> {
    throw new Error('Method not implemented.')
  }
  getAllPositions(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<PositionInfo>> {
    throw new Error('Method not implemented.')
  }
  getAllOrders(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<OrderInfo>> {
    throw new Error('Method not implemented.')
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
  async getOpenTradePreview(
    wallet: string,
    orderData: CreateOrder[],
    existingPos: (PositionInfo | undefined)[],
    opts?: ApiOpts | undefined
  ): Promise<OpenTradePreviewInfo[]> {
    const previews: OpenTradePreviewInfo[] = []

    // get markets
    const markets = await this.getMarketsInfo(
      orderData.map((o) => o.marketId),
      opts
    )

    for (let i = 0; i < orderData.length; i++) {
      const m = markets[i]
      const o = orderData[i]

      // validate denominations
      if (!validDenomination(o.sizeDelta, true)) throw new Error('Size delta must be token denominated')
      if (!validDenomination(o.marginDelta, true)) throw new Error('Margin delta must be token denominated')

      const marginDeltaBN = getBNFromFN(o.marginDelta.amount)
      const sizeDeltaBN = getBNFromFN(o.sizeDelta.amount)

      const marketAddress = decodeMarketId(m.marketId).protocolMarketId
      const marketPrice = getTokenPriceD(m.indexToken.symbol, 18)!

      const futureMarket = m.metadata! as FuturesMarket
      const sTimeSB = getStaleTime(CACHE_MINUTE, opts)
      const sUsdBalanceInMarket = (await cacheFetch({
        key: [SYNV2_CACHE_PREFIX, 'sUSDBalanceMarket', wallet, m.marketId],
        fn: () =>
          this.sdk.futures.getIdleMarginInMarketsCached(wallet, [futureMarket]).then((r) => r.totalIdleInMarkets),
        staleTime: sTimeSB,
        cacheTime: sTimeSB * CACHE_TIME_MULT,
        opts
      })) as Wei

      let sizeDelta = wei(sizeDeltaBN)
      sizeDelta = o.direction == 'LONG' ? sizeDelta : sizeDelta.neg()

      const tradePreviewPromise = this.sdk.futures.getSimulatedIsolatedTradePreview(
        wallet,
        getEnumEntryByValue(FuturesMarketKey, m.metadata.marketKey!)!,
        marketAddress,
        {
          sizeDelta: sizeDelta,
          marginDelta: wei(marginDeltaBN).sub(sUsdBalanceInMarket),
          orderPrice: wei(getBNFromFN(o.triggerData!.triggerPrice))
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
      const priceImpactPer = marketPrice.sub(fillPrice).abs().mul(100).mul(BigNumber.from(10).pow(18)).div(marketPrice)
      const leverage = marginDeltaBN.gt(ZERO) ? tradePreview.size.mul(marketPrice).div(marginDeltaBN).abs() : undefined

      previews.push({
        marketId: o.marketId,
        collateral: o.collateral,
        leverage: leverage ? FixedNumber.fromValue(leverage.toString(), 18, 18) : FixedNumber.fromString('0'),
        size: toAmountInfo(tradePreview.size.abs(), D18, true),
        margin: toAmountInfo(tradePreview.margin, D18, true),
        avgEntryPrice: FixedNumber.fromValue(tradePreview.price.toString(), D18, D18),
        liqudationPrice: FixedNumber.fromValue(tradePreview.liqPrice.toString(), D18, D18),
        fee: FixedNumber.fromValue(tradePreview.fee.add(keeperFee).toString(), D18, D18),
        priceImpact: FixedNumber.fromValue(priceImpactPer.toString(), D18, D18),
        isError: tradePreview.status != PotentialTradeStatus.OK,
        errMsg: this._getErrorString(tradePreview.status)
      })
    }

    return previews
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

  ////////// Internal helper methods //////////

  // to be used because we don't have index token list for snx
  private _getPartialToken(symbol: string): Token {
    return {
      symbol: symbol,
      name: '',
      decimals: 0,
      address: {
        [arbitrum.id]: undefined,
        [optimism.id]: undefined
      }
    }
  }

  // get token symbol from FutureMarketAsset type
  private _getTokenSymbol(asset: FuturesMarketAsset): string {
    if (asset == FuturesMarketAsset.sBTC) {
      return 'BTC'
    } else if (asset == FuturesMarketAsset.sETH) {
      return 'ETH'
    } else {
      return asset
    }
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
