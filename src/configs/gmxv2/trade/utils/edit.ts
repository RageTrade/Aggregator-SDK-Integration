import { BigNumber, ethers } from 'ethers'
import { applyFactor, parseValue } from '../../lib/numbers'
import { PositionInfo } from '../../positions/types'
import { usePositionsConstants } from '../../positions/usePositionsConstants'
import { TokenData } from '../../tokens/types'
import { convertToTokenAmount, convertToUsd } from '../../tokens/utils'
import { getFeeItem, getTotalFeeItem } from '../../fees/utils'
import { TradeFees } from '../types'
import { getLeverage, getLiquidationPrice } from '../../positions/utils'
import { MAX_ALLOWED_LEVERAGE } from '../../config/factors'

export function getMinCollateralUsdForLeverage(position: PositionInfo) {
  const { marketInfo, isLong } = position

  let minCollateralFactor = isLong
    ? marketInfo.minCollateralFactorForOpenInterestLong
    : marketInfo.minCollateralFactorForOpenInterestShort

  const minCollateralFactorForMarket = marketInfo.minCollateralFactor

  if (minCollateralFactorForMarket.gt(minCollateralFactor)) {
    minCollateralFactor = minCollateralFactorForMarket
  }

  const minCollateralUsdForLeverage = applyFactor(position.sizeInUsd, minCollateralFactor)

  return minCollateralUsdForLeverage
}

export const getNextUpdateMarginValues = async (
  isDeposit: boolean,
  collateralDeltaAmount: BigNumber,
  collateralToken: TokenData,
  position: PositionInfo,
  userReferralInfo = undefined
) => {
  const { minCollateralUsd } = await usePositionsConstants(42161)

  if (!minCollateralUsd) throw new Error('min collateral usd not found')

  const collateralPrice = collateralToken?.prices.minPrice

  const collateralDeltaUsd = convertToUsd(collateralDeltaAmount, collateralToken.decimals, collateralPrice)

  if (!collateralDeltaUsd || !collateralDeltaAmount) {
    throw new Error('collateral delta not found in update margin preview')
  }

  const collateralBasisUsd = isDeposit
    ? position.collateralUsd.add(collateralDeltaUsd || BigNumber.from(0))
    : position.collateralUsd

  const fundingFee = getFeeItem(position.pendingFundingFeesUsd.mul(-1), collateralBasisUsd)
  const borrowFee = getFeeItem(position.pendingBorrowingFeesUsd.mul(-1), collateralBasisUsd)
  const totalFees = getTotalFeeItem([fundingFee, borrowFee])

  const fees: TradeFees = {
    totalFees,
    fundingFee,
    borrowFee
  }

  if (!fees.totalFees) throw new Error('fees not calcuated')

  const totalFeesUsd = fees.totalFees.deltaUsd.abs()

  const nextCollateralUsd = isDeposit
    ? position.collateralUsd.sub(totalFeesUsd).add(collateralDeltaUsd)
    : position.collateralUsd.sub(totalFeesUsd).sub(collateralDeltaUsd)

  const nextCollateralAmount = convertToTokenAmount(nextCollateralUsd, collateralToken.decimals, collateralPrice)!

  const receiveUsd = isDeposit ? BigNumber.from(0) : collateralDeltaUsd
  const receiveAmount = convertToTokenAmount(receiveUsd, collateralToken?.decimals, collateralPrice)!

  const showPnlInLeverage = true

  const nextLeverage = getLeverage({
    sizeInUsd: position.sizeInUsd,
    collateralUsd: nextCollateralUsd,
    pendingBorrowingFeesUsd: BigNumber.from(0),
    pendingFundingFeesUsd: BigNumber.from(0),
    pnl: showPnlInLeverage ? position.pnl : BigNumber.from(0)
  })

  const nextLiqPrice = getLiquidationPrice({
    sizeInUsd: position.sizeInUsd,
    sizeInTokens: position.sizeInTokens,
    collateralUsd: nextCollateralUsd,
    collateralAmount: nextCollateralAmount,
    collateralToken: position.collateralToken,
    marketInfo: position.marketInfo,
    userReferralInfo,
    pendingFundingFeesUsd: BigNumber.from(0),
    pendingBorrowingFeesUsd: BigNumber.from(0),
    isLong: position.isLong,
    minCollateralUsd
  })

  return {
    nextCollateralUsd,
    nextLeverage,
    nextLiqPrice,
    receiveUsd,
    receiveAmount,
    totalFeesUsd
  }
}

export function getEditCollateralError(p: {
  collateralDeltaAmount: BigNumber | undefined
  collateralDeltaUsd: BigNumber | undefined
  nextCollateralUsd: BigNumber | undefined
  minCollateralUsd: BigNumber | undefined
  nextLiqPrice: BigNumber | undefined
  nextLeverage: BigNumber | undefined
  position: PositionInfo | undefined
  isDeposit: boolean
  depositToken: TokenData | undefined
  depositAmount: BigNumber | undefined
}) {
  const {
    collateralDeltaAmount,
    collateralDeltaUsd,
    minCollateralUsd,
    nextCollateralUsd,
    nextLeverage,
    nextLiqPrice,
    position,
    isDeposit,
    depositToken,
    depositAmount
  } = p

  if (!collateralDeltaAmount || !collateralDeltaUsd || collateralDeltaAmount.eq(0) || collateralDeltaUsd?.eq(0)) {
    throw new Error('collateral values not defined')
  }

  if (isDeposit && depositToken && depositAmount && depositAmount.gt(depositToken.balance || 0)) {
    throw new Error(`Insufficient ${depositToken.symbol} balance`)
  }

  if (nextCollateralUsd && minCollateralUsd && position) {
    const minCollateralUsdForLeverage = getMinCollateralUsdForLeverage(position)

    if (nextCollateralUsd.lt(minCollateralUsdForLeverage)) {
      throw new Error('remaning collateral less than min limit')
    }
  }

  if (nextLiqPrice && position?.markPrice) {
    if (position?.isLong && nextLiqPrice.lt(ethers.constants.MaxUint256) && position?.markPrice.lt(nextLiqPrice)) {
      throw new Error('invalid liquidation price')
    }

    if (!position.isLong && position.markPrice.gt(nextLiqPrice)) {
      throw new Error('invalid liquidation price')
    }
  }

  if (nextLeverage && nextLeverage.gt(MAX_ALLOWED_LEVERAGE)) {
    throw new Error('max leverage exceed')
  }

  return [undefined]
}
