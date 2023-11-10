import { BigNumber } from 'ethers'
import { TokenData, TokensRatio } from '../../tokens/types'
import { FindSwapPath, SwapAmounts } from '../types'
import { convertToUsd } from '../../tokens/utils'

export function getSwapAmountsByFromValue(p: {
  tokenIn: TokenData
  tokenOut: TokenData
  amountIn: BigNumber
  triggerRatio?: TokensRatio
  isLimit: boolean
}): SwapAmounts {
  const { tokenIn, tokenOut, amountIn, triggerRatio, isLimit } = p

  const priceIn = tokenIn.prices.minPrice
  const priceOut = tokenOut.prices.maxPrice

  const usdIn = convertToUsd(amountIn, tokenIn.decimals, priceIn)!

  let amountOut = BigNumber.from(0)
  let usdOut = BigNumber.from(0)
  let minOutputAmount = BigNumber.from(0)

  const defaultAmounts: SwapAmounts = {
    amountIn,
    usdIn,
    amountOut,
    usdOut,
    minOutputAmount,
    priceIn,
    priceOut,
    swapPathStats: undefined
  }

  if (amountIn.lte(0)) {
    return defaultAmounts
  }

  amountOut = amountIn
  usdOut = usdIn
  minOutputAmount = amountOut

  return {
    amountIn,
    usdIn,
    amountOut,
    usdOut,
    minOutputAmount,
    priceIn,
    priceOut,
    swapPathStats: undefined
  }
}
