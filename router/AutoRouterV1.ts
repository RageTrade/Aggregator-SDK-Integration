import { ethers } from "ethers-v6";
import { Token } from "../src/common/tokens";
import { AmountInfo, ApiOpts, CreateOrder, MarketInfo, OpenTradePreviewInfo, PositionInfo, TradeDirection } from "../src/interfaces/V1/IRouterAdapterBaseV1";
import RouterV1 from "./RouterV1";
import { RouteData, getReduceCallback } from "./Route";

export default class AutoRouterV1 extends RouterV1 {

    private async _getEligibleMarkets(indexToken: Token, collateralToken: Token, direction: TradeDirection): Promise<MarketInfo[]> {
        const chains = this.supportedChains()
        const markets = await this.supportedMarkets(chains)
        const eligibleMarkets = markets.filter((market) => {
            const correctIndex = market.indexToken.symbol == indexToken.symbol
            const correctCollateral = direction == 'LONG' ? market.longCollateral.includes(collateralToken) : market.shortCollateral.includes(collateralToken)
            return correctIndex && correctCollateral
        })
        return eligibleMarkets
    }

    private _getCreateOrder(market: MarketInfo, routeData: RouteData) {
        const order: CreateOrder = {
            marketId: market.marketId,
            collateral: routeData.collateralToken,
            direction: routeData.direction,
            sizeDelta: routeData.sizeDelta,
            marginDelta: routeData.marginDelta,
            triggerData: undefined,
            slippage: undefined,
            type: 'MARKET'
        }
        return order
    }

    async _getAllRoutes(
        routeData: RouteData,
        opts?: ApiOpts
    ): Promise<OpenTradePreviewInfo[]> {

        const eligibleMarkets = await this._getEligibleMarkets(routeData.indexToken, routeData.collateralToken, routeData.direction);
        const wallet = ethers.ZeroAddress
        const promises: Promise<OpenTradePreviewInfo[]>[] = []
        eligibleMarkets.forEach((market) => {
            const protocolId = this._checkAndGetProtocolId(market.marketId)
            const order = this._getCreateOrder(market, routeData)
            promises.push(this.adapters[protocolId].getOpenTradePreview(wallet, [order], [], opts))
        })
        const out = await Promise.all(promises)
        return out.flat()
    }

    async getBestRoute(
        routeData: RouteData,
        opts?: ApiOpts
    ): Promise<OpenTradePreviewInfo> {
        const routes = await this._getAllRoutes(routeData, opts)
        console.log({routes});
        const reduceCallback = getReduceCallback(routeData.direction)
        let bestRoute = routes.reduce(reduceCallback)
        return bestRoute
    }
}
