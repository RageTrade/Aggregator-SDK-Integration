import { BigNumber } from 'ethers'
import { SwapStats, TradeFees } from '../types'
import { SwapFeeItem } from '../../fees/types'
import { getBasisPoints } from '../../lib/numbers'
import { getFeeItem, getTotalFeeItem } from '../../fees/utils'

export function getTradeFees(p: {
  isIncrease: boolean
  initialCollateralUsd: BigNumber
  sizeDeltaUsd: BigNumber
  swapSteps: SwapStats[]
  positionFeeUsd: BigNumber
  swapPriceImpactDeltaUsd: BigNumber
  positionPriceImpactDeltaUsd: BigNumber
  borrowingFeeUsd: BigNumber
  fundingFeeUsd: BigNumber
  feeDiscountUsd: BigNumber
  swapProfitFeeUsd: BigNumber
}): TradeFees {
  const {
    isIncrease,
    initialCollateralUsd,
    sizeDeltaUsd,
    swapSteps,
    positionFeeUsd,
    swapPriceImpactDeltaUsd,
    positionPriceImpactDeltaUsd,
    borrowingFeeUsd,
    fundingFeeUsd,
    feeDiscountUsd,
    swapProfitFeeUsd
  } = p

  const swapFees: SwapFeeItem[] | undefined = initialCollateralUsd.gt(0)
    ? swapSteps.map((step) => ({
        tokenInAddress: step.tokenInAddress,
        tokenOutAddress: step.tokenOutAddress,
        marketAddress: step.marketAddress,
        deltaUsd: step.swapFeeUsd.mul(-1),
        bps: !step.usdIn.eq(0) ? getBasisPoints(step.swapFeeUsd.mul(-1), step.usdIn) : BigNumber.from(0)
      }))
    : undefined

  const swapProfitFee = getFeeItem(swapProfitFeeUsd.mul(-1), initialCollateralUsd)

  const swapPriceImpact = getFeeItem(swapPriceImpactDeltaUsd, initialCollateralUsd)

  const positionFeeBeforeDiscount = getFeeItem(positionFeeUsd.add(feeDiscountUsd).mul(-1), sizeDeltaUsd)
  const positionFeeAfterDiscount = getFeeItem(positionFeeUsd.mul(-1), sizeDeltaUsd)

  const borrowFee = getFeeItem(borrowingFeeUsd.mul(-1), initialCollateralUsd)

  const fundingFee = getFeeItem(fundingFeeUsd.mul(-1), initialCollateralUsd)

  const positionPriceImpact = getFeeItem(positionPriceImpactDeltaUsd, sizeDeltaUsd)

  const totalFees = getTotalFeeItem([
    ...(swapFees || []),
    swapProfitFee,
    swapPriceImpact,
    positionFeeAfterDiscount,
    positionPriceImpact,
    borrowFee,
    fundingFee
  ])

  const payTotalFees = getTotalFeeItem([
    ...(swapFees || []),
    swapProfitFee,
    swapPriceImpact,
    positionFeeAfterDiscount,
    borrowFee,
    fundingFee,
    !isIncrease ? positionPriceImpact : undefined
  ])

  return {
    totalFees,
    payTotalFees,
    swapFees,
    swapProfitFee,
    swapPriceImpact,
    positionFee: positionFeeBeforeDiscount,
    positionPriceImpact,
    borrowFee,
    fundingFee,
    feeDiscountUsd
  }
}
