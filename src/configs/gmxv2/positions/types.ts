import { BigNumber } from 'ethers'
import { MarketInfo } from '../markets/types'
import { TokenData } from '../tokens/types'

export type PendingPositionUpdate = {
  isIncrease: boolean
  positionKey: string
  sizeDeltaUsd: BigNumber
  sizeDeltaInTokens: BigNumber
  collateralDeltaAmount: BigNumber
  updatedAt: number
  updatedAtBlock: BigNumber
}

export type Position = {
  key: string
  contractKey: string
  account: string
  marketAddress: string
  collateralTokenAddress: string
  sizeInUsd: BigNumber
  sizeInTokens: BigNumber
  collateralAmount: BigNumber
  pendingBorrowingFeesUsd: BigNumber
  increasedAtBlock: BigNumber
  decreasedAtBlock: BigNumber
  isLong: boolean
  fundingFeeAmount: BigNumber
  claimableLongTokenAmount: BigNumber
  claimableShortTokenAmount: BigNumber
  isOpening?: boolean
  pendingUpdate?: PendingPositionUpdate
  data: string
}

export type PositionInfo = Position & {
  marketInfo: MarketInfo
  indexToken: TokenData
  collateralToken: TokenData
  pnlToken: TokenData
  markPrice: BigNumber
  entryPrice: BigNumber | undefined
  liquidationPrice: BigNumber | undefined
  collateralUsd: BigNumber
  remainingCollateralUsd: BigNumber
  remainingCollateralAmount: BigNumber
  hasLowCollateral: boolean
  pnl: BigNumber
  pnlPercentage: BigNumber
  pnlAfterFees: BigNumber
  pnlAfterFeesPercentage: BigNumber
  leverage: BigNumber | undefined
  leverageWithPnl: BigNumber | undefined
  netValue: BigNumber
  closingFeeUsd: BigNumber
  pendingFundingFeesUsd: BigNumber
  pendingClaimableFundingFeesUsd: BigNumber
}

export type PositionsData = {
  [positionKey: string]: Position
}

export type PositionsInfoData = {
  [positionKey: string]: PositionInfo
}
