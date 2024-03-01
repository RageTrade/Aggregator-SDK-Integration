import { FixedNumber, addFN } from '../src/common/fixedNumber'
import { Token } from '../src/common/tokens'
import {
  AmountInfo,
  DynamicMarketMetadata,
  MarketInfo,
  OpenTradePreviewInfo,
  TradeDirection
} from '../src/interfaces/V1/IRouterAdapterBaseV1'

export type RouteOptions = {
  allowedChains: string[]
}

export type TokenWithPrice = {
  token: Token
  price: FixedNumber
}

export type RouteData = {
  marketSymbol: string
  collateralTokens: TokenWithPrice[]
  direction: TradeDirection
  sizeDeltaUSD: FixedNumber
  marginDeltaUSD: FixedNumber
  opts?: RouteOptions
}

export type MarketTag = {
  tagDesc: string
  tagColor: string
  sortedMarkets: {
    market: MarketInfo
    collateralToken: Token | undefined
  }[]
}

export type MarketWithMetadata = {
  market: MarketInfo
  metadata: DynamicMarketMetadata
}

export type MarketWithPreview = {
  market: MarketInfo
  collateralToken: Token
  preview: OpenTradePreviewInfo
}

export function getBestFundingSortCallback(tradeDirection: TradeDirection) {
  if (tradeDirection == 'LONG')
    return (prev: MarketWithMetadata, curr: MarketWithMetadata) => {

      const eq = prev && addFN(prev.metadata.longFundingRate, prev.metadata.longBorrowRate).eq(
        addFN(curr.metadata.longFundingRate, curr.metadata.longBorrowRate)
      )

      if (eq) return 0

      const gt = prev && addFN(prev.metadata.longFundingRate, prev.metadata.longBorrowRate).gt(
        addFN(curr.metadata.longFundingRate, curr.metadata.longBorrowRate)
      )

      return gt ? 1 : -1
    }

  else
    return (prev: MarketWithMetadata, curr: MarketWithMetadata) => {
      const eq = prev &&
        addFN(prev.metadata.shortFundingRate, prev.metadata.shortBorrowRate).gt(
          addFN(curr.metadata.shortFundingRate, curr.metadata.shortBorrowRate)
        )

      if (eq) return 0

      const gt = prev &&
        addFN(prev.metadata.shortFundingRate, prev.metadata.shortBorrowRate).gt(
          addFN(curr.metadata.shortFundingRate, curr.metadata.shortBorrowRate)
        )

      return gt ? 1 : -1
    }
}

export function getBestPriceSortCallback(tradeDirection: TradeDirection) {
  if (tradeDirection == 'LONG')
    return (prev: MarketWithPreview, curr: MarketWithPreview) => {
      const eq = prev && prev.preview.avgEntryPrice.eq(curr.preview.avgEntryPrice)

      if (eq) return 0

      const lt = prev && prev.preview.avgEntryPrice.lt(curr.preview.avgEntryPrice)
      return lt ? 1 : -1
    }
  else
    return (prev: MarketWithPreview, curr: MarketWithPreview) => {
      const eq = prev && prev.preview.avgEntryPrice.eq(curr.preview.avgEntryPrice)
      if (eq) return 0

      const gt = prev && prev.preview.avgEntryPrice.gt(curr.preview.avgEntryPrice)
      return gt ? 1 : -1
    }
}

export function getBestPriceReduceCallback(tradeDirection: TradeDirection) {
  if (tradeDirection == 'LONG')
    return (prev: MarketWithPreview, curr: MarketWithPreview) =>
      prev && prev.preview.avgEntryPrice.lt(curr.preview.avgEntryPrice) ? prev : curr
  else
    return (prev: MarketWithPreview, curr: MarketWithPreview) =>
      prev && prev.preview.avgEntryPrice.gt(curr.preview.avgEntryPrice) ? prev : curr
}

export function getMinFeeSortCallback() {
  return (prev: MarketWithPreview, curr: MarketWithPreview) => {
    const eq = prev && prev.preview.fee.eq(curr.preview.fee)
    if (eq) return 0

    const lt = prev && prev.preview.fee.lt(curr.preview.fee)
    return lt ? 1 : -1
  }
}
