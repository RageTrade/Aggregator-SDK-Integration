import { Token } from "../src/common/tokens"
import { AmountInfo, OpenTradePreviewInfo, TradeDirection } from "../src/interfaces/V1/IRouterAdapterBaseV1"

export type RouteOptions = {
    allowedChains: string[],
}

export type RouteData = {
    indexToken: Token,
    collateralToken: Token,
    direction: TradeDirection,
    sizeDelta: AmountInfo,
    marginDelta: AmountInfo,
    opts?: RouteOptions
}

export function getReduceCallback(tradeDirection: TradeDirection) {
    if (tradeDirection == 'LONG') return (prev: OpenTradePreviewInfo, curr: OpenTradePreviewInfo) => (prev && prev.avgEntryPrice < curr.avgEntryPrice) ? prev : curr
    else return (prev: OpenTradePreviewInfo, curr: OpenTradePreviewInfo) => (prev && prev.avgEntryPrice > curr.avgEntryPrice) ? prev : curr
}
