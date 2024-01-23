import HyperliquidAdapterV1 from '../src/exchanges/hyperliquid'
import { CreateOrder } from '../src/interfaces/V1/IRouterAdapterBaseV1'
import { parseUnits } from 'ethers/lib/utils'
import { toAmountInfo } from '../src/common/helper'
import { HL_COLLATERAL_TOKEN } from '../src/configs/hyperliquid/api/client'
import { FixedNumber } from '../src/common/fixedNumber'

const normalAddress = '0x2f88a09ed4174750a464576FE49E586F90A34820'
const liquidatedAddress = '0x2f88a09ed4174750a464576FE49E586F90A34820'
const w = normalAddress

const hl = new HyperliquidAdapterV1()

const ethMarketId = '9999998-HL-ETH'
const btcMarketId = '9999998-HL-BTC'
const ntrnMarketId = '9999998-HL-NTRN'
const kPepeMarketId = '9999998-HL-kPEPE'

async function supportedMarkets() {
  const markets = await hl.supportedMarkets(hl.supportedChains())
  //   console.dir(markets, { depth: 2 })
  markets.forEach((m) => {
    console.log(m.marketId)
  })
}

async function getMarketsInfo() {
  const marketInfo = await hl.getMarketsInfo([ethMarketId, btcMarketId, ntrnMarketId], undefined)
  console.dir(marketInfo, { depth: 2 })
}

async function getMarketPrices() {
  const markets = await hl.supportedMarkets(hl.supportedChains())
  const prices = await hl.getMarketPrices(
    markets.map((m) => m.marketId),
    undefined
  )
  console.log(prices)
}

async function getDynamicMarketMetadata() {
  const markets = await hl.supportedMarkets(hl.supportedChains())
  const metadata = await hl.getDynamicMarketMetadata(
    markets.map((m) => m.marketId) /* [ethMarketId] */,
    undefined
  )
  markets.forEach((m, index) => {
    console.log(m.marketId, '=> ', metadata[index])
  })
}

async function getAllPositions() {
  const positions = await hl.getAllPositions(w, undefined)
  console.dir(positions.result, { depth: 4 })
}

async function getAllOrders() {
  const orders = await hl.getAllOrders(w, undefined)
  console.dir(orders.result, { depth: 4 })
}

async function getAllOrdersForPosition() {
  const positions = await hl.getAllPositions(w, undefined)
  const orders = await hl.getAllOrdersForPosition(w, positions.result, undefined)
  console.dir(orders, { depth: 6 })
}

async function getAccountInfo() {
  const accountInfo = await hl.getAccountInfo(w, undefined)
  console.dir(accountInfo, { depth: 4 })
}

async function getMarketState() {
  const marketState = await hl.getMarketState(w, [ethMarketId, btcMarketId, ntrnMarketId], undefined)
  console.dir(marketState, { depth: 4 })
}

async function getTradesHistory() {
  const tradesHistory = await hl.getTradesHistory(w, {
    skip: 0,
    limit: 4
  })
  console.dir(tradesHistory, { depth: 4 })
}

async function getLiquidationHistory() {
  const liquidationHistory = await hl.getLiquidationHistory(w, undefined)
  console.dir(liquidationHistory, { depth: 4 })
}

async function getOpenTradePreview() {
  const orderData: CreateOrder = {
    marketId: btcMarketId,
    direction: 'LONG',
    sizeDelta: toAmountInfo(parseUnits('0.00275', 18), 18, true),
    marginDelta: toAmountInfo(parseUnits('13.75', 18), 18, true),
    triggerData: {
      triggerPrice: FixedNumber.fromString('20000'),
      triggerAboveThreshold: false,
      triggerActivatePrice: undefined
    },
    collateral: HL_COLLATERAL_TOKEN,
    type: 'LIMIT',
    slippage: 1
  }

  const positions = (await hl.getAllPositions(w, undefined)).result

  const openTradePreview = await hl.getOpenTradePreview(
    w,
    [orderData],
    positions.filter((p) => p.marketId === orderData.marketId),
    undefined
  )
  console.dir(openTradePreview, { depth: 4 })
}

hl.init(w).then(() => {
  getOpenTradePreview()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
})
