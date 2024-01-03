import RouterV1 from '../router/RouterV1'
import GmxV1Adapter from '../src/exchanges/gmxV1Adapter'
import {
  CancelOrder,
  ClosePositionData,
  CreateOrder,
  PositionInfo,
  UpdatePositionMarginData
} from '../src/interfaces/V1/IRouterAdapterBaseV1'
import { getBNFromFN, logObject, toAmountInfo } from '../src/common/helper'
import { parseUnits } from 'ethers/lib/utils'
import { getTokenBySymbol } from '../src/common/tokens'
import { FixedNumber } from '../src/common/fixedNumber'

const ex = new GmxV1Adapter()
const rt = new RouterV1()

const normalAddress = '0x2f88a09ed4174750a464576FE49E586F90A34820'
const liquidatedAddress = '0xC41427A0B49eB775E022E676F0412B12df1193a5'
const w = normalAddress

const btcMarketId = '42161-GMXV1-0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
const ethMarketId = '42161-GMXV1-0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'

async function supportedMarkets() {
  const markets = await ex.supportedMarkets(ex.supportedChains())
  markets.forEach((m) => {
    logObject('Market: ', m)
  })
}

async function getAllPositions() {
  console.log('GMXV1Router')
  for (let i = 0; i < 5; i++) {
    console.time('getAllPositions')
    const positions = (await ex.getAllPositions(w, undefined)).result
    console.timeEnd('getAllPositions')
    // positions.forEach((p, index) => {
    //   console.log('Position: ', index)
    //   const{metadata, ...rest} = p
    //   for(const key in rest) {
    //     const value = p[key as keyof PositionInfo]
    //     console.log(key, '=>', value)
    //   }
    //   console.log('----------------\n')
    // })
  }
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
  const trades = (
    await ex.getTradesHistory(w, {
      limit: 3,
      skip: 0
    })
  ).result
  console.dir({ trades }, { depth: 4 })
}

async function getLiquidationHistory() {
  const liquidations = (
    await ex.getLiquidationHistory(w, {
      limit: 3,
      skip: 0
    })
  ).result
  console.dir({ liquidations }, { depth: 4 })
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

async function increasePosition() {
  await ex.init(w)

  const createOrderData: CreateOrder = {
    marketId: btcMarketId,
    direction: 'LONG',
    sizeDelta: toAmountInfo(parseUnits('52', 30), 30, false),
    marginDelta: toAmountInfo(parseUnits('0.014', 18), 18, true),
    triggerData: {
      // triggerPrice: (await ex.getMarketPrices([btcMarketId]))[0],
      triggerPrice: FixedNumber.fromValue(parseUnits('30000', 30).toString(), 30, 30),
      triggerAboveThreshold: false
    },
    collateral: getTokenBySymbol('ETH'),
    type: 'LIMIT',
    slippage: 1
  }

  const txs = await ex.increasePosition([createOrderData], w)
  console.dir({ txs }, { depth: 4 })
}

async function closePosition() {
  await ex.init(w)

  const position = (await ex.getAllPositions(w, undefined)).result[0] as PositionInfo

  const closePositionData: ClosePositionData = {
    closeSize: toAmountInfo(getBNFromFN(position.size.amount).mul(50).div(100), 30, false),
    type: 'TAKE_PROFIT',
    triggerData: {
      triggerPrice: FixedNumber.fromValue(parseUnits('125936', 30).toString(), 30, 30),
      triggerAboveThreshold: true
    },
    outputCollateral: getTokenBySymbol('USDC')
  }

  const txs = await ex.closePosition([position], [closePositionData], w)
  txs.forEach((tx) => {
    logObject('Close position tx: ', tx.tx)
  })
}

async function updatePositionMargin() {
  await ex.init(w)

  const position = (await ex.getAllPositions(w, undefined)).result[0] as PositionInfo
  const marginDelta = toAmountInfo(
    parseUnits('0.001', position.collateral.decimals),
    position.collateral.decimals,
    true
  )
  const marginDelataUsd = toAmountInfo(parseUnits('5', 30), 30, false)
  const upmd: UpdatePositionMarginData = {
    collateral: getTokenBySymbol('ETH'),
    margin: marginDelataUsd,
    isDeposit: false
  }

  const txs = await ex.updatePositionMargin([position], [upmd], w)
  txs.forEach((tx) => {
    logObject('Update margin tx: ', tx.tx)
  })
}

async function cancelOrder() {
  const orders = (await ex.getAllOrders(w, undefined)).result

  const cancelData: CancelOrder[] = orders.map((o) => {
    return {
      orderId: o.orderId,
      marketId: o.marketId,
      type: o.orderType
    }
  })

  const txs = await ex.cancelOrder(cancelData, w)
  txs.forEach((tx) => {
    logObject('Cancel order tx: ', tx.tx)
  })
}

increasePosition()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
