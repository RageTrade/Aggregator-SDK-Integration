import { FixedNumber, abs, bipsDiff } from '../../common/fixedNumber'

export function aevoMarketIdToAsset(marketId: string): string {
  return marketId.split('-')[2]
}

export function aevoIndexBasisSlippage(val: Array<string[]>, slippageBp: string): number {
  const val0p = FixedNumber.fromString(val[0][0])
  let index = 0
  for (let i = 1; i < val.length; i++) {
    const bidp = FixedNumber.fromString(val[i][0])
    if (abs(bipsDiff(val0p, bidp)).lte(FixedNumber.fromString(slippageBp, val0p.decimals))) {
      index = i
    } else {
      break
    }
  }
  return index
}

export function aevoInstrumentNameToAsset(instrument_name: string): string {
  return instrument_name.split('-')[0]
}
