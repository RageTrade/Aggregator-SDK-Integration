import { CandlesResolution } from '@reyaxyz/api-sdk'

import type { SupportedResolutions } from '../../interfaces'

export function reyaMarketIdToAsset(marketId: string): string {
  return marketId.split('-')[2]
}

const resolutionMapper: { [key in SupportedResolutions]: CandlesResolution } = {
  '1': CandlesResolution.ONE_MINUTE,
  '5': CandlesResolution.FIVE_MINUTES,
  '15': CandlesResolution.FIFTEEN_MINUTES,
  '30': CandlesResolution.THIRTY_MINUTES,
  '60': CandlesResolution.ONE_HOUR,
  '120': CandlesResolution.FOUR_HOURS,
  '240': CandlesResolution.FOUR_HOURS,
  '720': CandlesResolution.FOUR_HOURS,
  '1D': CandlesResolution.ONE_DAY,
  '1W': CandlesResolution.ONE_DAY, // If not defined in CandlesResolution
  '1M': CandlesResolution.ONE_DAY // If not defined in CandlesResolution
}

export function mapResolution(resolution: SupportedResolutions): CandlesResolution {
  return resolutionMapper[resolution]
}
