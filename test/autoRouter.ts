import { parseUnits } from 'ethers-v6'
import AutoRouterV1 from '../router/AutoRouterV1'
import { RouteData } from '../router/Route'
import { toAmountInfo } from '../src/common/helper'
import { getGmxV2TokenBySymbol } from '../src/configs/gmxv2/gmxv2Tokens'
import { BigNumber } from 'ethers'
import { FixedNumber } from '../src/common/fixedNumber'
import { sUsd } from '../src/exchanges/synthetixV2Adapter'
import { startHermesStreaming, startStreaming } from '../src/configs/pyth/prices'

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

async function testBestRoute() {
  console.time('AutoRouterV1')
  const router = new AutoRouterV1()
  console.timeEnd('AutoRouterV1')

  console.time('RouteData')
  const routeData: RouteData = {
    indexToken: getGmxV2TokenBySymbol('BTC'),
    collateralTokens: [
      { token: getGmxV2TokenBySymbol('USDC'), price: FixedNumber.fromValue(parseUnits('1', 30), 30, 30) },
      { token: sUsd, price: FixedNumber.fromValue(parseUnits('1', 30), 30, 30) }
    ],
    direction: 'LONG',
    sizeDeltaToken: FixedNumber.fromValue(parseUnits('1', 18), 18, 18),
    sizeDeltaUSD: FixedNumber.fromValue(parseUnits('2200', 30), 30, 30),
    marginDeltaUSD: FixedNumber.fromValue(parseUnits('1000', 30), 30, 30)
  }
  console.timeEnd('RouteData')

  console.log({ routeData })

  console.time('startStreaming')
  startHermesStreaming()
  startStreaming()
  await delay(1000)
  console.timeEnd('startStreaming')

  console.time('getMarketTags-1')
  const tags = await router.getMarketTags(routeData)
  console.timeEnd('getMarketTags-1')

  tags.forEach((tag) => {
    console.log({ marketId: tag.market.marketId, tagDesc: tag.tagDesc, tagColor: tag.tagColor })
  })

  console.time('getMarketTags-2')
  const tags2 = await router.getMarketTags(routeData)
  console.timeEnd('getMarketTags-2')
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
