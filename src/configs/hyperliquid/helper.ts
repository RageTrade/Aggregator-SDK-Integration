import { Level } from './api/types'
import { FixedNumber, abs, bipsDiff } from '../../common/fixedNumber'

export function indexBasisSlippage(val: Level[], slippageBp: string): number {
  const val0p = FixedNumber.fromString(val[0].px)
  let index = 0
  for (let i = 1; i < val.length; i++) {
    const bidp = FixedNumber.fromString(val[i].px)
    if (abs(bipsDiff(val0p, bidp)).lte(FixedNumber.fromString(slippageBp, val0p.decimals))) {
      index = i
    } else {
      break
    }
  }
  return index
}
