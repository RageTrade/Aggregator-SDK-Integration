import { FixedNumber } from '../../common/fixedNumber'
import { TraverseResult } from '../../common/types'
import { AevoWssOrderBook } from './aevoWsClient'

export function traverseAevoBook(
  levels: AevoWssOrderBook['asks'],
  size: FixedNumber,
  marketPrice: FixedNumber,
  feeBps: FixedNumber
): TraverseResult {
  let avgPriceAcc = FixedNumber.fromValue(0)
  let remainingSize = size
  let feesAcc = FixedNumber.fromValue(0)

  for (let i = 0; i < levels!.length; i++) {
    const level = levels![i]
    const levelSize = FixedNumber.fromString(level[1])
    const levelPrice = FixedNumber.fromString(level[0])

    if (remainingSize.gt(levelSize)) {
      remainingSize = remainingSize.subFN(levelSize)

      // increment fees and avgPriceAc
      avgPriceAcc = avgPriceAcc.addFN(levelPrice.mulFN(levelSize))
      feesAcc = feesAcc.addFN(levelSize.mulFN(levelPrice).mulFN(feeBps))
    } else {
      // remainingSize <= levelSize
      // increment fees and avgPriceAc
      avgPriceAcc = avgPriceAcc.addFN(levelPrice.mulFN(remainingSize))
      feesAcc = feesAcc.addFN(remainingSize.mulFN(levelPrice).mulFN(feeBps))
      remainingSize = FixedNumber.fromValue(0)
      break
    }
  }

  const avgExecPrice = avgPriceAcc.divFN(size.subFN(remainingSize))
  const fees = feesAcc
  const priceImpact = remainingSize.isZero()
    ? avgExecPrice.subFN(marketPrice).divFN(marketPrice).mulFN(FixedNumber.fromValue(100)).abs()
    : FixedNumber.fromValue(100)

  return {
    avgExecPrice,
    fees,
    remainingSize,
    priceImpact
  }
}
