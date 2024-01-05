import { parseUnits } from 'ethers-v6'
import AutoRouterV1 from '../router/AutoRouterV1'
import { RouteData } from '../router/Route'
import { toAmountInfo } from '../src/common/helper'
import { getGmxV2TokenBySymbol } from '../src/configs/gmxv2/gmxv2Tokens'
import { BigNumber } from 'ethers'
import { FixedNumber } from '../src/common/fixedNumber'
import { sUsd } from '../src/exchanges/synthetixV2Adapter'
import { getTokenPrice, getTokenPriceD, startHermesStreaming, startStreaming } from '../src/configs/pyth/prices'

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

async function testBestRoute() {
  startHermesStreaming()
  startStreaming()
  await delay(5000)

  const router = new AutoRouterV1()

  const marketTokenSymbol = 'ETH'
  const indexToken = getGmxV2TokenBySymbol(marketTokenSymbol)
  const indexTokenPrice = getTokenPriceD(marketTokenSymbol, 30)!
  const sizeDelta = '1'
  const marginDelta = '1000'

  const routeData: RouteData = {
    indexToken: indexToken,
    collateralTokens: [
      { token: getGmxV2TokenBySymbol('USDC'), price: FixedNumber.fromValue(parseUnits('1', 30), 30, 30) },
      { token: sUsd, price: FixedNumber.fromValue(parseUnits('1', 30), 30, 30) }
    ],
    direction: 'LONG',
    sizeDeltaToken: FixedNumber.fromValue(
      parseUnits(sizeDelta, indexToken.decimals),
      indexToken.decimals,
      indexToken.decimals
    ),
    sizeDeltaUSD: FixedNumber.fromValue(indexTokenPrice.mul(sizeDelta).toString(), 30, 30),
    marginDeltaUSD: FixedNumber.fromValue(parseUnits(marginDelta, 30), 30, 30)
  }
  console.log({ routeData })

  const tags = await router.getMarketTags(routeData)

  tags.forEach((tag) => {
    console.log({ marketId: tag.market.marketId, tagDesc: tag.tagDesc, tagColor: tag.tagColor })
  })

  // console.time('getMarketTags-2')
  // const tags2 = await router.getMarketTags(routeData)
  // console.timeEnd('getMarketTags-2')
}

testBestRoute()
  .then(() => {
    console.log('done')
    process.exit(0)
  })
  .catch((err) => {
    console.log(err)
    process.exit(1)
  })
