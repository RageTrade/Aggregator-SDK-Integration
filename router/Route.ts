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
  indexToken: Token
  collateralTokens: TokenWithPrice[]
  direction: TradeDirection
  sizeDeltaToken: FixedNumber
  sizeDeltaUSD: FixedNumber
  marginDeltaUSD: FixedNumber
  opts?: RouteOptions
}

// TODO: Add optional collateral
export type MarketTag = {
  market: MarketInfo
  tagDesc: String
  tagColor: String
}

export type MarketWithMetadata = {
  market: MarketInfo
  metadata: DynamicMarketMetadata
}

// TODO: Add optional collateral
export type MarketWithPreview = {
  market: MarketInfo
  preview: OpenTradePreviewInfo
}

export function getBestFundingReduceCallback(tradeDirection: TradeDirection) {
  if (tradeDirection == 'LONG')
    return (prev: MarketWithMetadata, curr: MarketWithMetadata) =>
      prev &&
      addFN(prev.metadata.longFundingRate, prev.metadata.longBorrowRate).lt(
        addFN(curr.metadata.longFundingRate, curr.metadata.longBorrowRate)
      )
        ? prev
        : curr
  else
    return (prev: MarketWithMetadata, curr: MarketWithMetadata) =>
      prev &&
      addFN(prev.metadata.shortFundingRate, prev.metadata.shortBorrowRate).lt(
        addFN(curr.metadata.shortFundingRate, curr.metadata.shortBorrowRate)
      )
        ? prev
        : curr
}

export function getReduceCallback(tradeDirection: TradeDirection) {
  if (tradeDirection == 'LONG')
    return (prev: MarketWithPreview, curr: MarketWithPreview) =>
      prev && prev.preview.avgEntryPrice.lt(curr.preview.avgEntryPrice) ? prev : curr
  else
    return (prev: MarketWithPreview, curr: MarketWithPreview) =>
      prev && prev.preview.avgEntryPrice.gt(curr.preview.avgEntryPrice) ? prev : curr
}
