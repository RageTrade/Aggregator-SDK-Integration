import RouterV1 from '../router/RouterV1'
import GmxV1Adapter from '../src/exchanges/gmxV1Adapter'
import { ClosePositionData, CreateOrder, PositionInfo } from '../src/interfaces/V1/IRouterAdapterBaseV1'
import { getBNFromFN, logObject, toAmountInfo } from '../src/common/helper'
import { parseUnits } from 'ethers/lib/utils'
import { getTokenBySymbol } from '../src/common/tokens'
import { FixedNumber } from '../src/common/fixedNumber'

const ex = new GmxV1Adapter()
const rt = new RouterV1()

const w = '0x2f88a09ed4174750a464576FE49E586F90A34820'

const btcMarketId = '42161-GMXV1-0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
const ethMarketId = '42161-GMXV1-0x0000000000000000000000000000000000000000'

async function supportedMarkets() {
  const markets = await ex.supportedMarkets(ex.supportedChains())
  markets.forEach((m) => {
    logObject('Market: ', m)
  })
}

async function getAllPositions() {
  const positions = await ex.getAllPositions(w, undefined)
  console.dir({ positions }, { depth: 6 })
}

async function getAllOrders() {
  const orders = (await ex.getAllOrders(w, undefined)).result
  console.dir({ orders }, { depth: 4 })
}

async function getAllOrdersForPosition() {
  const position = (await ex.getAllPositions(w, undefined)).result[0]
  const orders = await ex.getAllOrdersForPosition(w, [position], undefined)
  console.dir({ orders }, { depth: 6 })
}

async function getTradesHistory() {
  const trades = await ex.getTradesHistory(w, {
    limit: 3,
    skip: 0
  })
  console.dir({ trades }, { depth: 6 })
}

async function getOpenTradePreview() {
  const createOrderData: CreateOrder = {
    marketId: btcMarketId,
    direction: 'LONG',
    sizeDelta: toAmountInfo(parseUnits('52', 30), 30, false),
    marginDelta: toAmountInfo(parseUnits('0.014', 18), 18, true),
    triggerData: {
      triggerPrice: (await ex.getMarketPrices([btcMarketId]))[0],
      triggerAboveThreshold: false
    },
    collateral: getTokenBySymbol('ETH'),
    type: 'MARKET',
    slippage: 1
  }

  const position = (await ex.getAllPositions(w, undefined)).result[0]
  const preview = (
    await ex.getOpenTradePreview(w, [createOrderData], [position], {
      bypassCache: true,
      overrideStaleTime: 5 * 1000
    })
  )[0]
  console.dir({ preview }, { depth: 4 })
}

async function getCloseTradePreview() {
  const position = (await ex.getAllPositions(w, undefined)).result[0] as PositionInfo

  const closePositionData: ClosePositionData = {
    closeSize: toAmountInfo(getBNFromFN(position.size.amount).mul(10).div(100), 30, false),
    type: 'TAKE_PROFIT',
    triggerData: {
      triggerPrice: FixedNumber.fromValue(parseUnits('40000', 30).toString(), 30, 30),
      triggerAboveThreshold: true
    },
    outputCollateral: getTokenBySymbol('USDC')
  }

  const preview = (
    await ex.getCloseTradePreview(w, [position], [closePositionData], {
      bypassCache: true,
      overrideStaleTime: 5 * 1000
    })
  )[0]
  console.dir({ preview }, { depth: 4 })
}

async function getUpdateMarginPreview() {
  const position = (await ex.getAllPositions(w, undefined)).result[0] as PositionInfo
  const marginDelta = toAmountInfo(
    parseUnits('0.00005', position.collateral.decimals),
    position.collateral.decimals,
    true
  )

  const preview = (
    await ex.getUpdateMarginPreview(w, [true], [marginDelta], [position], {
      bypassCache: true,
      overrideStaleTime: 5 * 1000
    })
  )[0]
  console.dir({ preview }, { depth: 4 })
}

getUpdateMarginPreview()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
