import { ethers, parseUnits } from 'ethers-v6'
import { Token } from '../src/common/tokens'
import {
  AmountInfo,
  AmountInfoInToken,
  ApiOpts,
  CreateOrder,
  DynamicMarketMetadata,
  MarketInfo,
  OpenTradePreviewInfo,
  PositionInfo,
  ProtocolId,
  TradeDirection
} from '../src/interfaces/V1/IRouterAdapterBaseV1'
import ConsolidatedRouterV1 from './ConsolidatedRouterV1'
import {
  MarketTag,
  MarketWithMetadata,
  MarketWithPreview,
  RouteData,
  TokenWithPrice,
  getBestFundingReduceCallback,
  getBestPriceReduceCallback,
  getMinFeeReduceCallback
} from './Route'
import { IAdapterV1 } from '../src/interfaces/V1/IAdapterV1'
import { FixedNumber, divFN, mulFN } from '../src/common/fixedNumber'
import { Chain } from 'viem'

export default class AutoRouterV1 extends ConsolidatedRouterV1 {
  private _logMarkets(markets: MarketInfo[]) {
    if (markets.length == 0) {
      console.log('## >> NO ELIGIBLE MARKETS << ##')
      return
    }
    markets.forEach((market) => {
      console.log('eligible Market', {
        marketId: market.marketId,
        indexToken: market.indexToken.symbol,
        longCollateral: market.longCollateral.map((token) => token.symbol),
        shortCollateral: market.shortCollateral.map((token) => token.symbol)
      })
    })
  }
  private async _getEligibleMarkets(
    marketSymbol: string,
    collateralTokenWithPriceList: TokenWithPrice[],
    direction: TradeDirection,
    allowedChains?: Chain[],
    allowedProtocols?: ProtocolId[],
    opts?: ApiOpts
  ): Promise<MarketInfo[]> {
    const chains = this.supportedChains()
    let markets = await this.supportedMarkets(allowedChains ? allowedChains : chains, opts)

    if (allowedProtocols && allowedProtocols.length > 0) {
      markets = markets.filter((market) => allowedProtocols.includes(market.protocolId))
    }

    const collateralTokenSymbols = collateralTokenWithPriceList.map((tokenWithPrice) => tokenWithPrice.token.symbol)
    const eligibleMarkets = markets.filter((market) => {
      const correctMarketSymbol = market.marketSymbol == marketSymbol
      const collateralSymbols =
        direction == 'LONG'
          ? market.longCollateral.map((token) => token.symbol)
          : market.shortCollateral.map((token) => token.symbol)
      const correctCollateral = collateralSymbols.some((cSymbol) => collateralTokenSymbols.includes(cSymbol))
      return correctMarketSymbol && correctCollateral
    })
    this._logMarkets(eligibleMarkets)
    return eligibleMarkets
  }

  private _convertAmountInfo(amountInfo: AmountInfo, price: FixedNumber, tokenDecimals: number): AmountInfo {
    const isTokenAmount = !amountInfo.isTokenAmount
    let amount: FixedNumber
    if (amountInfo.isTokenAmount) {
      amount = mulFN(amountInfo.amount, price, 30)
    } else {
      amount = divFN(amountInfo.amount, price, 30)
    }

    return {
      amount: amount,
      isTokenAmount: isTokenAmount
    }
  }

  private _getCreateOrder(
    adapter: IAdapterV1,
    market: MarketInfo,
    routeData: RouteData,
    collateralTokenWithPrice: TokenWithPrice,
    marketPrice: FixedNumber
  ): CreateOrder {
    const amountInfoInToken = adapter.getAmountInfoType()

    const sizeDeltaToken = divFN(routeData.sizeDeltaUSD, marketPrice, market.indexToken.decimals)

    let sizeDeltaAmountInfo: AmountInfo = amountInfoInToken.sizeDeltaInToken
      ? { isTokenAmount: true, amount: sizeDeltaToken }
      : { isTokenAmount: false, amount: routeData.sizeDeltaUSD }

    const marginDeltaToken = divFN(
      routeData.marginDeltaUSD,
      collateralTokenWithPrice.price,
      collateralTokenWithPrice.token.decimals
    )
    let marginDeltaAmountInfo: AmountInfo = amountInfoInToken.collateralDeltaInToken
      ? { isTokenAmount: true, amount: marginDeltaToken }
      : { isTokenAmount: false, amount: routeData.marginDeltaUSD }

    const order: CreateOrder = {
      marketId: market.marketId,
      collateral: collateralTokenWithPrice.token,
      direction: routeData.direction,
      sizeDelta: sizeDeltaAmountInfo,
      marginDelta: marginDeltaAmountInfo,
      triggerData: { triggerPrice: marketPrice, triggerAboveThreshold: true },
      slippage: undefined,
      type: 'MARKET'
    }
    return order
  }

  async _getDynamicMarketMetadata(
    eligibleMarkets: MarketInfo[],
    opts?: ApiOpts | undefined
  ): Promise<MarketWithMetadata[]> {
    const promises: Promise<[MarketInfo, DynamicMarketMetadata[]]>[] = []

    eligibleMarkets.forEach((market) => {
      const adapter = this._checkAndGetAdapter(market.marketId)
      const marketWithMetadataPromise = Promise.all([market, adapter.getDynamicMarketMetadata([market.marketId], opts)])
      promises.push(marketWithMetadataPromise)
    })
    const out = await Promise.all(promises)
    return out.map((tuple) => {
      return {
        market: tuple[0],
        metadata: tuple[1][0]
      }
    })
  }

  async _getTradePreview(
    eligibleMarkets: MarketInfo[],
    routeData: RouteData,
    opts?: ApiOpts
  ): Promise<MarketWithPreview[]> {
    const wallet = ethers.ZeroAddress
    const promises: Promise<[MarketInfo, Token, OpenTradePreviewInfo[]]>[] = []

    const routeCollateralTokenSymbolMap = new Map<string, TokenWithPrice>()
    routeData.collateralTokens.forEach((tokenWithPrice) =>
      routeCollateralTokenSymbolMap.set(tokenWithPrice.token.symbol, tokenWithPrice)
    )
    const routeCollateralTokenSymbols = Array.from(routeCollateralTokenSymbolMap.keys())
    const marketPrices = await this.getMarketPrices(
      eligibleMarkets.map((m) => m.marketId),
      opts
    )

    for (let i = 0; i < eligibleMarkets.length; i++) {
      const market = eligibleMarkets[i]
      const marketPrice = marketPrices[i].toFormat(30)
      const adapter = this._checkAndGetAdapter(market.marketId)
      const marketCollateralTokens = routeData.direction == 'LONG' ? market.longCollateral : market.shortCollateral

      const eligibleCollateralTokens = marketCollateralTokens.filter((token) =>
        routeCollateralTokenSymbols.includes(token.symbol)
      )

      if (eligibleCollateralTokens.length == 0) {
        console.log(`## >> market ${market.marketId} has no eligible collateral tokens << ##`)
        continue
      }

      for (let j = 0; j < eligibleCollateralTokens.length; j++) {
        const collateralToken = eligibleCollateralTokens[j]

        const order = this._getCreateOrder(
          adapter,
          market,
          routeData,
          routeCollateralTokenSymbolMap.get(collateralToken.symbol)!,
          marketPrice
        )

        const marketWithPreviewPromise = Promise.all([
          market,
          collateralToken,
          adapter.getOpenTradePreview(wallet, [order], [], opts)
        ])
        promises.push(marketWithPreviewPromise)
      }
    }
    const out = await Promise.all(promises)
    return out.map((tuple) => {
      return {
        market: tuple[0],
        collateralToken: tuple[1],
        preview: tuple[2][0]
      }
    })
  }

  async getMarketTags(
    routeData: RouteData,
    allowedChains?: Chain[],
    allowedProtocols?: ProtocolId[],
    opts?: ApiOpts
  ): Promise<MarketTag[]> {
    const marketTags: MarketTag[] = []

    const eligibleMarkets = await this._getEligibleMarkets(
      routeData.marketSymbol,
      routeData.collateralTokens,
      routeData.direction,
      allowedChains,
      allowedProtocols
    )
    const dynamicMetadataPromise = this._getDynamicMarketMetadata(eligibleMarkets, opts)
    const tradePreviewsPromise = this._getTradePreview(eligibleMarkets, routeData, opts)

    const fundingReduceCB = getBestFundingReduceCallback(routeData.direction)
    const avgEntryPriceReduceCB = getBestPriceReduceCallback(routeData.direction)
    const minFeeReduceCB = getMinFeeReduceCallback()

    const dynamicMetadata = await dynamicMetadataPromise
    const bestFundingMarket = dynamicMetadata.length > 0 ? dynamicMetadata.reduce(fundingReduceCB) : undefined
    if (bestFundingMarket) {
      marketTags.push({
        market: bestFundingMarket.market,
        collateralToken: undefined,
        tagDesc: 'Best Funding',
        tagColor: '#0CAC6C'
      })
    }

    const tradePreviews = await tradePreviewsPromise
    // console.dir({ tps: tradePreviews.map((tp) => tp.preview) }, { depth: 4 })
    const bestAvgEntryPriceMarket = tradePreviews.length > 0 ? tradePreviews.reduce(avgEntryPriceReduceCB) : undefined
    if (bestAvgEntryPriceMarket) {
      marketTags.push({
        market: bestAvgEntryPriceMarket.market,
        collateralToken: undefined,
        tagDesc: 'Best Price',
        tagColor: '#38bdf8'
      })
    }

    const bestMinFeeMarket = tradePreviews.length > 0 ? tradePreviews.reduce(minFeeReduceCB) : undefined
    if (bestMinFeeMarket) {
      marketTags.push({
        market: bestMinFeeMarket.market,
        collateralToken: bestMinFeeMarket.collateralToken,
        tagDesc: 'Lowest Fee',
        tagColor: '#0CAC6C'
      })
    }

    eligibleMarkets
      .filter((m) => m.protocolId == 'GMXV2')
      .forEach((m) => {
        marketTags.push({
          market: m,
          collateralToken: undefined,
          tagDesc: 'Fee Rebates',
          tagColor: '#FBBE24'
        })
      })

    return marketTags
  }

  async getBestRoute(routeData: RouteData, opts?: ApiOpts): Promise<OpenTradePreviewInfo> {
    const eligibleMarkets = await this._getEligibleMarkets(
      routeData.marketSymbol,
      routeData.collateralTokens,
      routeData.direction
    )
    const routes = await this._getTradePreview(eligibleMarkets, routeData, opts)
    console.log({ routes })
    const reduceCallback = getBestPriceReduceCallback(routeData.direction)
    let bestRoute = routes.reduce(reduceCallback)
    return bestRoute.preview
  }
}
