import { parseUnits } from "ethers-v6"
import AutoRouterV1 from "../router/AutoRouterV1"
import { RouteData } from "../router/Route"
import { toAmountInfo } from "../src/common/helper"
import { getGmxV2TokenBySymbol } from "../src/configs/gmxv2/gmxv2Tokens"
import { BigNumber } from "ethers"

async function testBestRoute() {
    const router = new AutoRouterV1()
    const routeData: RouteData = {
        indexToken: getGmxV2TokenBySymbol('WETH'),
        collateralToken: getGmxV2TokenBySymbol('USDC'),
        direction: 'LONG',
        sizeDelta: toAmountInfo(BigNumber.from(parseUnits('1', 18)),18,true),
        marginDelta: toAmountInfo(BigNumber.from(parseUnits('1000', 6)),6,true),
    }
    const bestRoute = await router.getBestRoute(routeData)
}

testBestRoute().then(() => {
    console.log('done')
    process.exit(0)
}).catch((err) => {
    console.log(err)
    process.exit(1)
})