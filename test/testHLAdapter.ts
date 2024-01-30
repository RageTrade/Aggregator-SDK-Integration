import HyperliquidAdapterV1 from '../src/exchanges/hyperliquid'
import { ClosePositionData, CreateOrder } from '../src/interfaces/V1/IRouterAdapterBaseV1'
import { parseUnits } from 'ethers/lib/utils'
import { toAmountInfo, toAmountInfoFN } from '../src/common/helper'
import { HL_COLLATERAL_TOKEN, getAllMids } from '../src/configs/hyperliquid/api/client'
import { FixedNumber, divFN } from '../src/common/fixedNumber'
import { ethers } from 'ethers'

const normalAddress = '0xCc8aF787CB89438A767e357131294642ba7542A4'
const liquidatedAddress = '0x2f88a09ed4174750a464576FE49E586F90A34820'
const w = normalAddress

const hl = new HyperliquidAdapterV1()

const ethMarketId = '42161-HL-ETH'
const btcMarketId = '42161-HL-BTC'
const ntrnMarketId = '42161-HL-NTRN'
const kPepeMarketId = '42161-HL-kPEPE'

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
    mode: 'ISOLATED',
    direction: 'LONG',
    sizeDelta: toAmountInfo(parseUnits('0.00275', 18), 18, true),
    marginDelta: toAmountInfo(parseUnits('13.75', 18), 18, true),
    triggerData: {
      triggerPrice: FixedNumber.fromString('20000'),
      triggerAboveThreshold: false,
      triggerLimitPrice: undefined
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

async function getOrderBooks() {
  const orderBooks = await hl.getOrderBooks([ethMarketId], [undefined])
  console.dir(orderBooks, { depth: 6 })
}

async function getCloseTradePreview() {
  const positions = (await hl.getAllPositions(w, undefined)).result
  const btcPosition = positions.filter((p) => p.marketId === btcMarketId)[0]
  const ethPosition = positions.filter((p) => p.marketId === ethMarketId)[0]

  const crossMarketCOD: ClosePositionData = {
    closeSize: toAmountInfoFN(divFN(btcPosition.size.amount, FixedNumber.fromString('2')), true),
    type: 'MARKET',
    triggerData: undefined,
    outputCollateral: undefined
  }
  console.dir(await hl.getCloseTradePreview(w, [btcPosition], [crossMarketCOD], undefined), { depth: 4 })

  const crossTPCOD: ClosePositionData = {
    closeSize: toAmountInfoFN(divFN(btcPosition.size.amount, FixedNumber.fromString('2')), true),
    type: 'TAKE_PROFIT',
    triggerData: {
      triggerPrice: FixedNumber.fromString('10000'),
      triggerAboveThreshold: false,
      triggerLimitPrice: undefined
    },
    outputCollateral: undefined
  }
  console.dir(await hl.getCloseTradePreview(w, [btcPosition], [crossTPCOD], undefined), { depth: 4 })

  const crossSLCOD: ClosePositionData = {
    closeSize: toAmountInfoFN(divFN(btcPosition.size.amount, FixedNumber.fromString('2')), true),
    type: 'STOP_LOSS',
    triggerData: {
      triggerPrice: FixedNumber.fromString('45000'),
      triggerAboveThreshold: true,
      triggerLimitPrice: undefined
    },
    outputCollateral: undefined
  }
  console.dir(await hl.getCloseTradePreview(w, [btcPosition], [crossSLCOD], undefined), { depth: 4 })

  const crossTPLCOD: ClosePositionData = {
    closeSize: toAmountInfoFN(divFN(btcPosition.size.amount, FixedNumber.fromString('2')), true),
    type: 'TAKE_PROFIT_LIMIT',
    triggerData: {
      triggerPrice: FixedNumber.fromString('8000'),
      triggerAboveThreshold: false,
      triggerLimitPrice: FixedNumber.fromString('10000')
    },
    outputCollateral: undefined
  }
  console.dir(await hl.getCloseTradePreview(w, [btcPosition], [crossTPLCOD], undefined), { depth: 4 })

  const crossSLLCOD: ClosePositionData = {
    closeSize: toAmountInfoFN(divFN(btcPosition.size.amount, FixedNumber.fromString('2')), true),
    type: 'STOP_LOSS_LIMIT',
    triggerData: {
      triggerPrice: FixedNumber.fromString('40000'),
      triggerAboveThreshold: true,
      triggerLimitPrice: FixedNumber.fromString('45000')
    },
    outputCollateral: undefined
  }
  console.dir(await hl.getCloseTradePreview(w, [btcPosition], [crossSLLCOD], undefined), { depth: 4 })

  const isolatedMarketCOD: ClosePositionData = {
    closeSize: toAmountInfoFN(divFN(ethPosition.size.amount, FixedNumber.fromString('2')), true),
    type: 'MARKET',
    triggerData: undefined,
    outputCollateral: undefined
  }
  console.dir(await hl.getCloseTradePreview(w, [ethPosition], [isolatedMarketCOD], undefined), { depth: 4 })

  const isolatedTPCOD: ClosePositionData = {
    closeSize: toAmountInfoFN(divFN(ethPosition.size.amount, FixedNumber.fromString('2')), true),
    type: 'TAKE_PROFIT',
    triggerData: {
      triggerPrice: FixedNumber.fromString('3000'),
      triggerAboveThreshold: true,
      triggerLimitPrice: undefined
    },
    outputCollateral: undefined
  }
  console.dir(await hl.getCloseTradePreview(w, [ethPosition], [isolatedTPCOD], undefined), { depth: 4 })

  const isolatedSLCOD: ClosePositionData = {
    closeSize: toAmountInfoFN(divFN(ethPosition.size.amount, FixedNumber.fromString('2')), true),
    type: 'STOP_LOSS',
    triggerData: {
      triggerPrice: FixedNumber.fromString('1500'),
      triggerAboveThreshold: false,
      triggerLimitPrice: undefined
    },
    outputCollateral: undefined
  }
  console.dir(await hl.getCloseTradePreview(w, [ethPosition], [isolatedSLCOD], undefined), { depth: 4 })

  const isolatedTPLCOD: ClosePositionData = {
    closeSize: toAmountInfoFN(divFN(ethPosition.size.amount, FixedNumber.fromString('2')), true),
    type: 'TAKE_PROFIT_LIMIT',
    triggerData: {
      triggerPrice: FixedNumber.fromString('2800'),
      triggerAboveThreshold: true,
      triggerLimitPrice: FixedNumber.fromString('3000')
    },
    outputCollateral: undefined
  }
  console.dir(await hl.getCloseTradePreview(w, [ethPosition], [isolatedTPLCOD], undefined), { depth: 4 })

  const isolatedSLLCOD: ClosePositionData = {
    closeSize: toAmountInfoFN(divFN(ethPosition.size.amount, FixedNumber.fromString('2')), true),
    type: 'STOP_LOSS_LIMIT',
    triggerData: {
      triggerPrice: FixedNumber.fromString('1600'),
      triggerAboveThreshold: false,
      triggerLimitPrice: FixedNumber.fromString('1500')
    },
    outputCollateral: undefined
  }
  console.dir(await hl.getCloseTradePreview(w, [ethPosition], [isolatedSLLCOD], undefined), { depth: 4 })
}

async function getAvailableToTrade() {
  let att = await hl.getAvailableToTrade(w, {
    market: ethMarketId,
    mode: 'ISOLATED',
    direction: 'LONG',
    newLeverage: 5
  })

  console.dir(att, { depth: 6 })

  att = await hl.getAvailableToTrade(w, {
    market: ethMarketId,
    mode: 'CROSS',
    direction: 'LONG',
    newLeverage: 5
  })

  console.dir(att, { depth: 6 })

  att = await hl.getAvailableToTrade(w, {
    market: ethMarketId,
    mode: 'ISOLATED',
    direction: 'SHORT',
    newLeverage: 5
  })

  console.dir(att, { depth: 6 })

  att = await hl.getAvailableToTrade(w, {
    market: ethMarketId,
    mode: 'CROSS',
    direction: 'SHORT',
    newLeverage: 5
  })

  console.dir(att, { depth: 6 })
}

async function getUpdateMarginPreview() {
  const positions = (await hl.getAllPositions(w, undefined)).result
  const ethPosition = positions.filter((p) => p.marketId === ethMarketId)[0]

  const updateMarginPreview = await hl.getUpdateMarginPreview(
    w,
    [false],
    [toAmountInfoFN(FixedNumber.fromString('1.5'), true)],
    [ethPosition]
  )
  console.dir(updateMarginPreview, { depth: 4 })
}

async function testAgentState() {
  console.log(
    await hl.getAgentState(w, [
      {
        agentAddress: ethers.constants.AddressZero,
        protocolId: 'HL'
      }
    ])
  )
}

hl.init(w).then(() => {
  testAgentState()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
})
