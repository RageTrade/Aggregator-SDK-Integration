import { ReyaAdapterV1 } from '../../src/exchanges/reya'
import { FixedNumber, mulFN } from '../../fixedNumber'
import { parseUnits } from 'ethers/lib/utils'
import { CreateOrder } from '../../src/interfaces'
import { toAmountInfoFN } from '../../src/common/helper'
import { REYA_COLLATERAL_TOKEN } from '../../src/configs/reya/chains'


const aa = new ReyaAdapterV1()

const btcMarketId = '42161-REYA-BTC'
const ethMarketId = '42161-REYA-ETH'

const address = '0xaE173a960084903b1d278Ff9E3A81DeD82275556'

// required to be called before any other method
async function init() {
  await aa.init(address)
}

async function supportedMarkets() {
  const markets = await aa.supportedMarkets(aa.supportedChains())
  console.dir(markets, { depth: 4 })
}

async function getMarketPrices() {
  const prices = await aa.getMarketPrices([btcMarketId, ethMarketId])
  console.dir(prices, { depth: 4 })
}

async function getMarketsInfo() {
  const info = await aa.getMarketsInfo([btcMarketId, ethMarketId])
  console.dir(info, { depth: 4 })
}

async function getXpInfo() {
  const info = await aa.getXpInfo(address)
  console.dir(info, { depth: 4 })
}


async function getDynamicMarketMetadata() {
  const metadata = await aa.getDynamicMarketMetadata([btcMarketId, ethMarketId])
  console.dir(metadata, { depth: 4 })
}

async function getAllPositions() {
  await aa.init(address)
  const positions = (await aa.getAllPositions(address, undefined)).result
  console.dir(positions, { depth: 4 })
}

async function getAllOrders() {
  await aa.init(address)
  const orders = (await aa.getAllOrders(address, undefined)).result
  console.dir(orders, { depth: 4 })
}

async function getAccountInfo() {
  await aa.init(address)
  const accountInfo = await aa.getAccountInfo(address,)
  console.dir(accountInfo, { depth: 4 })
}

async function getAvailableToTrade() {
  await aa.init(address)
  const availableToTrade = await aa.getAvailableToTrade(address, undefined)
  console.dir(availableToTrade, { depth: 4 })
}


async function getTradesHistory() {
  await aa.init(address)

  const trades = await aa.getTradesHistory(address, undefined)
  console.dir(trades, { depth: 6 })
}

async function getLiquidationHistory() {
  await aa.init(address)

  const liquidations = await aa.getLiquidationHistory(address, undefined)
  console.dir(liquidations, { depth: 6 })
}

async function getOpenTradePreview() {
  await aa.init(address)

  const btcPrice = (await aa.getMarketPrices([btcMarketId], undefined))[0]

  const size = FixedNumber.fromValue(parseUnits('0.001', 18).toString(), 18)
  const lev = FixedNumber.fromString('5')
  const isTrigger = true
  const isLong = true
  const trigPrice = isTrigger ? (isLong ? FixedNumber.fromString('20000') : FixedNumber.fromString('80000')) : btcPrice

  const marginAmount = size.mulFN(trigPrice).divFN(lev)
  const sizeUsd = mulFN(marginAmount, lev)

  const orderData: CreateOrder = {
    marketId: btcMarketId,
    mode: 'CROSS',
    direction: isLong ? 'LONG' : 'SHORT',
    sizeDelta: toAmountInfoFN(size, true),
    marginDelta: toAmountInfoFN(marginAmount, true),
    triggerData: /* undefined */ {
      triggerPrice: trigPrice,
      triggerAboveThreshold: false,
      triggerLimitPrice: undefined
    },
    collateral: REYA_COLLATERAL_TOKEN,
    type: isTrigger ? 'LIMIT' : 'MARKET',
    slippage: 1
  }

  const positions = (await aa.getAllPositions(address, undefined)).result

  const openTradePreview = await aa.getOpenTradePreview(
    address,
    [orderData],
    positions.filter((p) => p.marketId === orderData.marketId),
  )
  console.dir(openTradePreview, { depth: 4 })
}

init()
// getXpInfo()
// getDynamicMarketMetadata()
// getAllPositions()
// getAllOrders()
// getAccountInfo()
// getAvailableToTrade()
// getTradesHistory()
// getLiquidationHistory()
getOpenTradePreview()