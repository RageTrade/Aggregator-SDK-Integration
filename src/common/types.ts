import { FixedNumber } from './fixedNumber'

export type TraverseResult = {
  avgExecPrice: FixedNumber
  fees: FixedNumber
  remainingSize: FixedNumber
  priceImpact: FixedNumber
}
