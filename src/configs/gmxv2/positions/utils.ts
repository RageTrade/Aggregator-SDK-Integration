import { BigNumber } from 'ethers'
import { applyFactor, expandDecimals } from '../lib/numbers'
import { BASIS_POINTS_DIVISOR } from '../config/factors'
import { TokenData } from '../tokens/types'
import { MarketInfo } from '../markets/types'
import { Token } from '../types'
import { getPositionFee, getPriceImpactForPosition } from '../fees/utils'
import { convertToUsd, getIsEquivalentTokens } from '../tokens/utils'
import { getCappedPoolPnl, getPoolUsdWithoutPnl } from '../markets/utils'
import { UserReferralInfo } from '../referrals/types'

export function getPositionKey(account: string, marketAddress: string, collateralAddress: string, isLong: boolean) {
  return `${account}:${marketAddress}:${collateralAddress}:${isLong}`
}

export function getEntryPrice(p: { sizeInUsd: BigNumber; sizeInTokens: BigNumber; indexToken: Token }) {
  const { sizeInUsd, sizeInTokens, indexToken } = p

  if (!sizeInTokens.gt(0)) {
    return undefined
  }

  return sizeInUsd.div(sizeInTokens).mul(expandDecimals(1, indexToken.decimals))
}

export function getLeverage(p: {
  sizeInUsd: BigNumber
  collateralUsd: BigNumber
  pnl: BigNumber | undefined
  pendingFundingFeesUsd: BigNumber
  pendingBorrowingFeesUsd: BigNumber
}) {
  const { pnl, sizeInUsd, collateralUsd, pendingBorrowingFeesUsd, pendingFundingFeesUsd } = p

  const totalPendingFeesUsd = getPositionPendingFeesUsd({ pendingFundingFeesUsd, pendingBorrowingFeesUsd })

  const remainingCollateralUsd = collateralUsd.add(pnl || 0).sub(totalPendingFeesUsd)

  if (remainingCollateralUsd.lte(0)) {
    return undefined
  }

  return sizeInUsd.mul(BASIS_POINTS_DIVISOR).div(remainingCollateralUsd)
}

export function getLiquidationPrice(p: {
  sizeInUsd: BigNumber
  sizeInTokens: BigNumber
  collateralAmount: BigNumber
  collateralUsd: BigNumber
  collateralToken: TokenData
  marketInfo: MarketInfo
  pendingFundingFeesUsd: BigNumber
  pendingBorrowingFeesUsd: BigNumber
  minCollateralUsd: BigNumber
  isLong: boolean
  useMaxPriceImpact?: boolean
  userReferralInfo: UserReferralInfo | undefined
}) {
  const {
    sizeInUsd,
    sizeInTokens,
    collateralUsd,
    collateralAmount,
    marketInfo,
    collateralToken,
    pendingFundingFeesUsd,
    pendingBorrowingFeesUsd,
    minCollateralUsd,
    isLong,
    userReferralInfo,
    useMaxPriceImpact
  } = p

  if (!sizeInUsd.gt(0) || !sizeInTokens.gt(0)) {
    return undefined
  }

  const { indexToken } = marketInfo

  const closingFeeUsd = getPositionFee(marketInfo, sizeInUsd, false, userReferralInfo).positionFeeUsd
  const totalPendingFeesUsd = getPositionPendingFeesUsd({ pendingFundingFeesUsd, pendingBorrowingFeesUsd })
  const totalFeesUsd = totalPendingFeesUsd.add(closingFeeUsd)

  const maxNegativePriceImpactUsd = applyFactor(sizeInUsd, marketInfo.maxPositionImpactFactorForLiquidations).mul(-1)

  let priceImpactDeltaUsd: BigNumber = BigNumber.from(0)

  if (useMaxPriceImpact) {
    priceImpactDeltaUsd = maxNegativePriceImpactUsd
  } else {
    priceImpactDeltaUsd = getPriceImpactForPosition(marketInfo, sizeInUsd.mul(-1), isLong, { fallbackToZero: true })

    if (priceImpactDeltaUsd.lt(maxNegativePriceImpactUsd)) {
      priceImpactDeltaUsd = maxNegativePriceImpactUsd
    }

    // Ignore positive price impact
    if (priceImpactDeltaUsd.gt(0)) {
      priceImpactDeltaUsd = BigNumber.from(0)
    }
  }

  let liquidationCollateralUsd = applyFactor(sizeInUsd, marketInfo.minCollateralFactor)
  if (liquidationCollateralUsd.lt(minCollateralUsd)) {
    liquidationCollateralUsd = minCollateralUsd
  }

  let liquidationPrice: BigNumber

  if (getIsEquivalentTokens(collateralToken, indexToken)) {
    if (isLong) {
      const denominator = sizeInTokens.add(collateralAmount)

      if (denominator.eq(0)) {
        return undefined
      }

      liquidationPrice = sizeInUsd
        .add(liquidationCollateralUsd)
        .sub(priceImpactDeltaUsd)
        .add(totalFeesUsd)
        .div(denominator)
        .mul(expandDecimals(1, indexToken.decimals))
    } else {
      const denominator = sizeInTokens.sub(collateralAmount)

      if (denominator.eq(0)) {
        return undefined
      }

      liquidationPrice = sizeInUsd
        .sub(liquidationCollateralUsd)
        .add(priceImpactDeltaUsd)
        .sub(totalFeesUsd)
        .div(denominator)
        .mul(expandDecimals(1, indexToken.decimals))
    }
  } else {
    if (sizeInTokens.eq(0)) {
      return undefined
    }

    const remainingCollateralUsd = collateralUsd.add(priceImpactDeltaUsd).sub(totalPendingFeesUsd).sub(closingFeeUsd)

    if (isLong) {
      liquidationPrice = liquidationCollateralUsd
        .sub(remainingCollateralUsd)
        .add(sizeInUsd)
        .div(sizeInTokens)
        .mul(expandDecimals(1, indexToken.decimals))
    } else {
      liquidationPrice = liquidationCollateralUsd
        .sub(remainingCollateralUsd)
        .sub(sizeInUsd)
        .div(sizeInTokens.mul(-1))
        .mul(expandDecimals(1, indexToken.decimals))
    }
  }

  if (liquidationPrice.lte(0)) {
    return undefined
  }

  return liquidationPrice
}

export function getPositionNetValue(p: {
  collateralUsd: BigNumber
  pendingFundingFeesUsd: BigNumber
  pendingBorrowingFeesUsd: BigNumber
  pnl: BigNumber
  closingFeeUsd: BigNumber
}) {
  const { pnl, closingFeeUsd, collateralUsd } = p

  const pendingFeesUsd = getPositionPendingFeesUsd(p)

  return collateralUsd.sub(pendingFeesUsd).sub(closingFeeUsd).add(pnl)
}

export function getPositionPendingFeesUsd(p: { pendingFundingFeesUsd: BigNumber; pendingBorrowingFeesUsd: BigNumber }) {
  const { pendingFundingFeesUsd, pendingBorrowingFeesUsd } = p

  return pendingBorrowingFeesUsd.add(pendingFundingFeesUsd)
}

export function getPositionPnlUsd(p: {
  marketInfo: MarketInfo
  sizeInUsd: BigNumber
  sizeInTokens: BigNumber
  markPrice: BigNumber
  isLong: boolean
}) {
  const { marketInfo, sizeInUsd, sizeInTokens, markPrice, isLong } = p

  const positionValueUsd = getPositionValueUsd({ indexToken: marketInfo.indexToken, sizeInTokens, markPrice })

  let totalPnl = isLong ? positionValueUsd.sub(sizeInUsd) : sizeInUsd.sub(positionValueUsd)

  if (totalPnl.lte(0)) {
    return totalPnl
  }

  const poolPnl = isLong ? p.marketInfo.pnlLongMax : p.marketInfo.pnlShortMax
  const poolUsd = getPoolUsdWithoutPnl(marketInfo, isLong, 'minPrice')

  const cappedPnl = getCappedPoolPnl({
    marketInfo,
    poolUsd,
    isLong,
    maximize: true
  })

  const WEI_PRECISION = expandDecimals(1, 18)

  if (!cappedPnl.eq(poolPnl) && cappedPnl.gt(0) && poolPnl.gt(0)) {
    totalPnl = totalPnl.mul(cappedPnl.div(WEI_PRECISION)).div(poolPnl.div(WEI_PRECISION))
  }

  return totalPnl
}

export function getPositionValueUsd(p: { indexToken: Token; sizeInTokens: BigNumber; markPrice: BigNumber }) {
  const { indexToken, sizeInTokens, markPrice } = p

  return convertToUsd(sizeInTokens, indexToken.decimals, markPrice)!
}
