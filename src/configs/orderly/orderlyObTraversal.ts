import { FixedNumber } from '../../common/fixedNumber'
import { TraverseResult } from '../../common/types'
import { OrderbookData, OrderbookEntry } from './types'

export function traverseOrderlyBook(
  obData: OrderbookData,
  size: number,
  feeBps: number,
  isLong: boolean
): Omit<TraverseResult, 'fees'> {
  let levels: OrderbookEntry[]
  if (isLong) {
    levels = obData.asks
  } else {
    levels = obData.bids
  }

  let avgPriceSum = 0
  let totalWeight = 0
  let startPrice = levels[0].price
  let endPrice = levels[0].price
  for (const level of levels) {
    let filledAmount = size
    size -= level.quantity
    filledAmount -= Math.max(size, 0)
    avgPriceSum += level.price * filledAmount
    totalWeight += filledAmount
    endPrice = level.price
    if (size <= 0) {
      break
    }
  }
  const avgPrice = avgPriceSum / totalWeight

  const priceImpact =
    size <= 0 ? FixedNumber.fromValue((Math.abs(startPrice - endPrice) * 100) / startPrice) : FixedNumber.fromValue(100)

  return {
    avgExecPrice: FixedNumber.fromValue(avgPrice),
    remainingSize: FixedNumber.fromValue(size),
    priceImpact
  }
}
