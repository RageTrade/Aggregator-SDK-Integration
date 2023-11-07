import { FixedNumber, parseEther, parseUnits } from 'ethers-v6'
import GmxV2Service from '../src/exchanges/gmxv2'
import { CreateOrder } from '../src/interfaces/V1/IRouterAdapterBaseV1'
import { tokens } from '../src/common/tokens'

const ex = new GmxV2Service()

const xrpMarketId = '0x0CCB4fAa6f1F1B30911619f1184082aB4E25813c:GMXV2:42161'
const ethMarketId = '0x70d95587d40A2caf56bd97485aB3Eec10Bee6336:GMXV2:42161'

async function testGetAllPositions() {
  const res = await ex.getAllPositions('0x2f88a09ed4174750a464576FE49E586F90A34820', undefined)
  console.dir({ res: res.result[0] }, { depth: 4 })
}

async function testSupportedMarkets() {
  const res = await ex.supportedMarkets(ex.supportedNetworks())
  console.dir({ res }, { depth: 4 })
}

async function testGetMarketsInfo() {
  const mIds = [xrpMarketId, ethMarketId]
  const res = await ex.getMarketsInfo(mIds)
  console.dir({ res }, { depth: 4 })
}

async function testMarketPrices() {
  const markets = await ex.supportedMarkets(ex.supportedNetworks())

  for (const m of markets) {
    const price = await ex.getMarketPrices([m.marketId])
    console.log(m.indexToken.symbol, ': ', { price })
  }
}

async function increasePosition() {
  const orders: CreateOrder[] = []

  await ex.setup('0x92B54cA40F1d7aca2E9c140176fabC1f7D7B387A')
  await ex.supportedMarkets(ex.supportedNetworks())

  // pass size delta in usd terms and margin delta in token terms

  // direction x type combinations for eth and erc20

  // orders.push({
  //   type: 'MARKET',
  //   marketId: ethMarketId,
  //   direction: 'LONG',
  //   sizeDelta: { amount: FixedNumber.fromValue(parseUnits('40', 30), 30), isTokenAmount: false },
  //   marginDelta: { amount: FixedNumber.fromValue(parseEther('0.02'), 18), isTokenAmount: true },
  //   triggerData: undefined,
  //   collateral: tokens.ETH,
  //   slippage: undefined
  // })
  //
  // orders.push({
  //   type: 'LIMIT',
  //   marketId: ethMarketId,
  //   direction: 'LONG',
  //   sizeDelta: { amount: FixedNumber.fromValue(parseUnits('40', 30), 30), isTokenAmount: false },
  //   marginDelta: { amount: FixedNumber.fromValue(parseEther('0.02'), 18), isTokenAmount: true },
  //   collateral: tokens.ETH,
  //   triggerData: { triggerPrice: FixedNumber.fromValue(parseEther('1800'), 18), triggerAboveThreshold: true },
  //   slippage: undefined
  // })
  //
  // orders.push({
  //   type: 'MARKET',
  //   marketId: ethMarketId,
  //   direction: 'SHORT',
  //   sizeDelta: { amount: FixedNumber.fromValue(parseUnits('40', 30), 30), isTokenAmount: false },
  //   marginDelta: { amount: FixedNumber.fromValue(parseEther('0.02'), 18), isTokenAmount: true },
  //   triggerData: undefined,
  //   collateral: tokens.ETH,
  //   slippage: undefined
  // })
  //
  // orders.push({
  //   type: 'LIMIT',
  //   marketId: ethMarketId,
  //   direction: 'SHORT',
  //   sizeDelta: { amount: FixedNumber.fromValue(parseUnits('40', 30), 30), isTokenAmount: false },
  //   marginDelta: { amount: FixedNumber.fromValue(parseEther('0.02'), 18), isTokenAmount: true },
  //   collateral: tokens.ETH,
  //   triggerData: { triggerPrice: FixedNumber.fromValue(parseEther('1800'), 18), triggerAboveThreshold: true },
  //   slippage: undefined
  // })
  //
  // orders.push({
  //   type: 'MARKET',
  //   marketId: xrpMarketId,
  //   direction: 'LONG',
  //   sizeDelta: { amount: FixedNumber.fromValue(parseUnits('50', 30), 30), isTokenAmount: false },
  //   marginDelta: { amount: FixedNumber.fromValue(parseEther('0.02'), 18), isTokenAmount: true },
  //   triggerData: undefined,
  //   collateral: tokens.ETH,
  //   slippage: 2
  // })
  //
  // orders.push({
  //   type: 'LIMIT',
  //   marketId: xrpMarketId,
  //   direction: 'LONG',
  //   sizeDelta: { amount: FixedNumber.fromValue(parseUnits('100', 30), 30), isTokenAmount: false },
  //   marginDelta: { amount: FixedNumber.fromValue(parseEther('20'), 6), isTokenAmount: true },
  //   collateral: tokens.USDC,
  //   triggerData: { triggerPrice: FixedNumber.fromValue(parseEther('0.5'), 18), triggerAboveThreshold: true },
  //   slippage: 2
  // })
  //
  // orders.push({
  //   type: 'MARKET',
  //   marketId: xrpMarketId,
  //   direction: 'SHORT',
  //   sizeDelta: { amount: FixedNumber.fromValue(parseUnits('50', 30), 30), isTokenAmount: false },
  //   marginDelta: { amount: FixedNumber.fromValue(parseEther('0.02'), 18), isTokenAmount: true },
  //   triggerData: undefined,
  //   collateral: tokens.ETH,
  //   slippage: 2
  // })
  //
  // orders.push({
  //   type: 'LIMIT',
  //   marketId: xrpMarketId,
  //   direction: 'SHORT',
  //   sizeDelta: { amount: FixedNumber.fromValue(parseUnits('40', 30), 30), isTokenAmount: false },
  //   marginDelta: { amount: FixedNumber.fromValue(parseEther('0.02'), 18), isTokenAmount: true },
  //   collateral: tokens.ETH,
  //   triggerData: { triggerPrice: FixedNumber.fromValue(parseEther('1800'), 18), triggerAboveThreshold: true },
  //   slippage: 2
  // })

  // console.log(await ex.increasePosition(orders))
}

async function test() {
  await increasePosition()
}

test()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
