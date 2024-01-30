import { CACHE_SECOND, CACHE_TIME_MULT, HL_CACHE_PREFIX, cacheFetch, getStaleTime } from '../../common/cache'
import { FixedNumber, abs, addFN, divFN, mulFN, subFN } from '../../common/fixedNumber'
import { ApiOpts, TradeDirection } from '../../interfaces/V1/IRouterAdapterBaseV1'
import { getL2Book } from './api/client'
import { HL_TAKER_FEE_BPS } from './api/config'
import { L2Book } from './api/types'
import { hlMarketIdToCoin } from './helper'

export type TraverseResult = {
  avgExecPrice: FixedNumber
  fees: FixedNumber
  remainingSize: FixedNumber
  priceImpact: FixedNumber
}

export async function traverseHLBook(
  marketId: string,
  direction: TradeDirection,
  size: FixedNumber,
  marketPrice: FixedNumber,
  opts?: ApiOpts
): Promise<TraverseResult> {
  const coin = hlMarketIdToCoin(marketId)

  // get the l2Book for each sig fig
  const l2BookPromises: Promise<L2Book>[] = []
  for (let nSigFigs = 2; nSigFigs <= 5; nSigFigs++) {
    const sTimeL2B = getStaleTime(CACHE_SECOND * 5, opts)
    const l2BookPromise = cacheFetch({
      key: [HL_CACHE_PREFIX, 'l2Book', coin, nSigFigs],
      fn: () => getL2Book(coin, nSigFigs),
      staleTime: sTimeL2B,
      cacheTime: sTimeL2B * CACHE_TIME_MULT,
      opts
    })

    l2BookPromises.push(l2BookPromise)
  }
  const l2Books = await Promise.all(l2BookPromises)

  // starting from the most precise book, traverse the book and see which book would be the first to fill the order
  let avgPriceAcc = FixedNumber.fromValue(0)
  let remainingSize = size
  let feesAcc = FixedNumber.fromValue(0)
  for (let i = l2Books.length - 1; i >= 0; i--) {
    // levels[0] is buy side, levels[1] is sell side
    const levels = l2Books[i].levels[direction === 'LONG' ? 1 : 0]

    avgPriceAcc = FixedNumber.fromValue(0)
    feesAcc = FixedNumber.fromValue(0)
    remainingSize = size
    for (let j = 0; j < levels.length; j++) {
      const level = levels[j]
      const levelSize = FixedNumber.fromString(level.sz)
      const levelPrice = FixedNumber.fromString(level.px)

      if (remainingSize.gt(levelSize)) {
        remainingSize = subFN(remainingSize, levelSize)

        // increment fees and avgPriceAc
        avgPriceAcc = addFN(avgPriceAcc, mulFN(levelPrice, levelSize))
        feesAcc = addFN(feesAcc, mulFN(mulFN(levelSize, levelPrice), FixedNumber.fromString(HL_TAKER_FEE_BPS)))
      } else {
        // remainingSize <= levelSize
        // increment fees and avgPriceAc
        avgPriceAcc = addFN(avgPriceAcc, mulFN(levelPrice, remainingSize))
        feesAcc = addFN(feesAcc, mulFN(mulFN(remainingSize, levelPrice), FixedNumber.fromString(HL_TAKER_FEE_BPS)))
        // console.log('satisfied at nSigFigs = ', i + 2)

        const execPrice = divFN(avgPriceAcc, size)
        const priceImpact = abs(mulFN(divFN(subFN(marketPrice, execPrice), marketPrice), FixedNumber.fromValue(100)))

        return {
          avgExecPrice: execPrice,
          fees: feesAcc,
          remainingSize: FixedNumber.fromValue(0),
          priceImpact: priceImpact
        }
      }
    }
  }

  return {
    avgExecPrice: divFN(avgPriceAcc, subFN(size, remainingSize)),
    fees: feesAcc,
    remainingSize: remainingSize,
    priceImpact: FixedNumber.fromValue(100)
  }
}
