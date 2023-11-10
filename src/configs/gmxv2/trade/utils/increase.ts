import { BigNumber } from 'ethers'
import { MarketInfo } from '../../markets/types'
import { TokenData } from '../../tokens/types'
import { PositionInfo } from '../../positions/types'
import { UserReferralInfo } from '../../referrals/types'
import { FindSwapPath, IncreasePositionAmounts, NextPositionValues } from '../types'
import { getAcceptablePriceInfo, getMarkPrice, getTriggerThresholdType } from './prices'
import { OrderType } from '../../orders'
import { convertToTokenAmount, convertToUsd, getIsEquivalentTokens } from '../../tokens/utils'
import { getSwapAmountsByFromValue } from './swap'
import { BASIS_POINTS_DIVISOR } from '../../config/factors'
import { getPositionFee, getPriceImpactForPosition } from '../../fees/utils'
import { getEntryPrice, getLeverage, getLiquidationPrice, getPositionPnlUsd } from '../../positions/utils'

export function getIncreasePositionAmounts(p: {
  marketInfo: MarketInfo
  indexToken: TokenData
  initialCollateralToken: TokenData
  collateralToken: TokenData
  isLong: boolean
  initialCollateralAmount: BigNumber | undefined
  position: PositionInfo | undefined
  indexTokenAmount: BigNumber | undefined
  leverage?: BigNumber
  triggerPrice?: BigNumber
  savedAcceptablePriceImpactBps?: BigNumber
  userReferralInfo: UserReferralInfo | undefined
  strategy: 'leverageBySize' | 'leverageByCollateral' | 'independent'
}): IncreasePositionAmounts {
  const {
    marketInfo,
    indexToken,
    initialCollateralToken,
    collateralToken,
    initialCollateralAmount,
    indexTokenAmount,
    isLong,
    leverage,
    triggerPrice,
    position,
    savedAcceptablePriceImpactBps,
    userReferralInfo,
    strategy
  } = p

  const values: IncreasePositionAmounts = {
    initialCollateralAmount: BigNumber.from(0),
    initialCollateralUsd: BigNumber.from(0),

    collateralDeltaAmount: BigNumber.from(0),
    collateralDeltaUsd: BigNumber.from(0),

    swapPathStats: undefined,

    indexTokenAmount: BigNumber.from(0),

    sizeDeltaUsd: BigNumber.from(0),
    sizeDeltaInTokens: BigNumber.from(0),

    estimatedLeverage: BigNumber.from(0),

    indexPrice: BigNumber.from(0),
    initialCollateralPrice: BigNumber.from(0),
    collateralPrice: BigNumber.from(0),
    triggerPrice: BigNumber.from(0),
    acceptablePrice: BigNumber.from(0),
    acceptablePriceDeltaBps: BigNumber.from(0),

    positionFeeUsd: BigNumber.from(0),
    feeDiscountUsd: BigNumber.from(0),
    borrowingFeeUsd: BigNumber.from(0),
    fundingFeeUsd: BigNumber.from(0),
    positionPriceImpactDeltaUsd: BigNumber.from(0)
  }

  const isLimit = triggerPrice?.gt(0)

  if (triggerPrice?.gt(0)) {
    values.triggerPrice = triggerPrice
    values.triggerThresholdType = getTriggerThresholdType(OrderType.LimitIncrease, isLong)

    values.indexPrice = triggerPrice

    values.initialCollateralPrice = getIsEquivalentTokens(indexToken, initialCollateralToken)
      ? triggerPrice
      : initialCollateralToken.prices.minPrice

    values.collateralPrice = getIsEquivalentTokens(indexToken, collateralToken)
      ? triggerPrice
      : collateralToken.prices.minPrice
  } else {
    values.indexPrice = getMarkPrice({ prices: indexToken.prices, isIncrease: true, isLong })
    values.initialCollateralPrice = initialCollateralToken.prices.minPrice
    values.collateralPrice = collateralToken.prices.minPrice
  }

  values.borrowingFeeUsd = position?.pendingBorrowingFeesUsd || BigNumber.from(0)
  values.fundingFeeUsd = position?.pendingFundingFeesUsd || BigNumber.from(0)

  if (!values.indexPrice.gt(0) || !values.initialCollateralPrice.gt(0) || !values.collateralPrice.gt(0)) {
    return values
  }

  // Size and collateral
  if (strategy === 'leverageByCollateral' && leverage && initialCollateralAmount?.gt(0)) {
    values.estimatedLeverage = leverage

    values.initialCollateralAmount = initialCollateralAmount
    values.initialCollateralUsd = convertToUsd(
      initialCollateralAmount,
      initialCollateralToken.decimals,
      values.initialCollateralPrice
    )!

    // TODO: collateralPrice?
    const swapAmounts = getSwapAmountsByFromValue({
      tokenIn: initialCollateralToken,
      tokenOut: collateralToken,
      amountIn: initialCollateralAmount,
      isLimit: false
    })

    values.swapPathStats = swapAmounts.swapPathStats

    const baseCollateralUsd = convertToUsd(swapAmounts.amountOut, collateralToken.decimals, values.collateralPrice)!
    const baseSizeDeltaUsd = baseCollateralUsd.mul(leverage).div(BASIS_POINTS_DIVISOR)
    const basePriceImpactDeltaUsd = getPriceImpactForPosition(marketInfo, baseSizeDeltaUsd, isLong)
    const basePositionFeeInfo = getPositionFee(
      marketInfo,
      baseSizeDeltaUsd,
      basePriceImpactDeltaUsd.gt(0),
      userReferralInfo
    )

    values.sizeDeltaUsd = baseCollateralUsd
      .sub(basePositionFeeInfo.positionFeeUsd)
      .mul(leverage)
      .div(BASIS_POINTS_DIVISOR)

    values.indexTokenAmount = convertToTokenAmount(values.sizeDeltaUsd, indexToken.decimals, values.indexPrice)!

    const positionFeeInfo = getPositionFee(
      marketInfo,
      values.sizeDeltaUsd,
      basePriceImpactDeltaUsd.gt(0),
      userReferralInfo
    )
    values.positionFeeUsd = positionFeeInfo.positionFeeUsd
    values.feeDiscountUsd = positionFeeInfo.discountUsd

    values.collateralDeltaUsd = baseCollateralUsd
      .sub(values.positionFeeUsd)
      .sub(values.borrowingFeeUsd)
      .sub(values.fundingFeeUsd)

    values.collateralDeltaAmount = convertToTokenAmount(
      values.collateralDeltaUsd,
      collateralToken.decimals,
      values.collateralPrice
    )!
  }

  const acceptablePriceInfo = getAcceptablePriceInfo({
    marketInfo,
    isIncrease: true,
    isLong,
    indexPrice: values.indexPrice,
    sizeDeltaUsd: values.sizeDeltaUsd
  })

  values.positionPriceImpactDeltaUsd = acceptablePriceInfo.priceImpactDeltaUsd
  values.acceptablePrice = acceptablePriceInfo.acceptablePrice
  values.acceptablePriceDeltaBps = acceptablePriceInfo.acceptablePriceDeltaBps

  if (isLimit) {
    const limitAcceptablePriceInfo = getAcceptablePriceInfo({
      marketInfo,
      isIncrease: true,
      isLong,
      indexPrice: values.indexPrice,
      sizeDeltaUsd: values.sizeDeltaUsd,
      maxNegativePriceImpactBps: savedAcceptablePriceImpactBps
    })

    values.acceptablePrice = limitAcceptablePriceInfo.acceptablePrice
    values.acceptablePriceDeltaBps = limitAcceptablePriceInfo.acceptablePriceDeltaBps

    if (values.positionPriceImpactDeltaUsd.lt(limitAcceptablePriceInfo.priceImpactDeltaUsd)) {
      values.positionPriceImpactDeltaUsd = limitAcceptablePriceInfo.priceImpactDeltaUsd
    }
  }

  let priceImpactAmount = BigNumber.from(0)

  if (values.positionPriceImpactDeltaUsd.gt(0)) {
    const price = triggerPrice?.gt(0) ? triggerPrice : indexToken.prices.maxPrice
    priceImpactAmount = convertToTokenAmount(values.positionPriceImpactDeltaUsd, indexToken.decimals, price)!
  } else {
    const price = triggerPrice?.gt(0) ? triggerPrice : indexToken.prices.minPrice
    priceImpactAmount = convertToTokenAmount(values.positionPriceImpactDeltaUsd, indexToken.decimals, price)!
  }

  values.sizeDeltaInTokens = convertToTokenAmount(values.sizeDeltaUsd, indexToken.decimals, values.indexPrice)!

  if (isLong) {
    values.sizeDeltaInTokens = values.sizeDeltaInTokens.add(priceImpactAmount)
  } else {
    values.sizeDeltaInTokens = values.sizeDeltaInTokens.sub(priceImpactAmount)
  }

  return values
}

export function getNextPositionValuesForIncreaseTrade(p: {
  existingPosition?: PositionInfo
  marketInfo: MarketInfo
  collateralToken: TokenData
  sizeDeltaUsd: BigNumber
  sizeDeltaInTokens: BigNumber
  collateralDeltaUsd: BigNumber
  collateralDeltaAmount: BigNumber
  indexPrice: BigNumber
  isLong: boolean
  showPnlInLeverage: boolean
  minCollateralUsd: BigNumber
  userReferralInfo: UserReferralInfo | undefined
}): NextPositionValues {
  const {
    existingPosition,
    marketInfo,
    collateralToken,
    sizeDeltaUsd,
    sizeDeltaInTokens,
    collateralDeltaUsd,
    collateralDeltaAmount,
    indexPrice,
    isLong,
    showPnlInLeverage,
    minCollateralUsd,
    userReferralInfo
  } = p

  // console.log({
  //   existingPosition,
  //   // marketInfo,
  //   collateralToken,
  //   sizeDeltaUsd,
  //   sizeDeltaInTokens,
  //   collateralDeltaUsd,
  //   collateralDeltaAmount,
  //   indexPrice,
  //   isLong,
  //   showPnlInLeverage,
  //   minCollateralUsd,
  //   userReferralInfo
  // })

  const nextCollateralUsd = existingPosition
    ? existingPosition.collateralUsd.add(collateralDeltaUsd)
    : collateralDeltaUsd

  const nextCollateralAmount = existingPosition
    ? existingPosition.collateralAmount.add(collateralDeltaAmount)
    : collateralDeltaAmount

  const nextSizeUsd = existingPosition ? existingPosition.sizeInUsd.add(sizeDeltaUsd) : sizeDeltaUsd
  const nextSizeInTokens = existingPosition ? existingPosition.sizeInTokens.add(sizeDeltaInTokens) : sizeDeltaInTokens

  const nextEntryPrice =
    getEntryPrice({
      sizeInUsd: nextSizeUsd,
      sizeInTokens: nextSizeInTokens,
      indexToken: marketInfo.indexToken
    }) || indexPrice

  const nextPnl = existingPosition
    ? getPositionPnlUsd({
        marketInfo,
        sizeInUsd: nextSizeUsd,
        sizeInTokens: nextSizeInTokens,
        markPrice: indexPrice,
        isLong
      })
    : undefined

  const nextLeverage = getLeverage({
    sizeInUsd: nextSizeUsd,
    collateralUsd: nextCollateralUsd,
    pnl: showPnlInLeverage ? nextPnl : undefined,
    pendingBorrowingFeesUsd: BigNumber.from(0), // deducted on order
    pendingFundingFeesUsd: BigNumber.from(0) // deducted on order
  })

  const nextLiqPrice = getLiquidationPrice({
    marketInfo,
    collateralToken,
    sizeInUsd: nextSizeUsd,
    sizeInTokens: nextSizeInTokens,
    collateralUsd: nextCollateralUsd,
    collateralAmount: nextCollateralAmount,
    minCollateralUsd,
    pendingBorrowingFeesUsd: BigNumber.from(0), // deducted on order
    pendingFundingFeesUsd: BigNumber.from(0), // deducted on order
    isLong: isLong,
    userReferralInfo
  })

  return {
    nextSizeUsd,
    nextCollateralUsd,
    nextEntryPrice,
    nextLeverage,
    nextLiqPrice
  }
}
