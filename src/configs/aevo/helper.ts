import { FixedNumber, abs, bipsDiff } from '../../common/fixedNumber'
import { HL_LEV_OUT_OF_BOUNDS } from '../hyperliquid/hlErrors'
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

export function to6Decimals(input: number | string): number {
  const inputNumber = typeof input === 'string' ? parseFloat(input) : input
  const result = inputNumber * 1e6
  return Number(result.toFixed(6))
}

export function to6DecimalsFN(input: FixedNumber): number {
  const inputNumber = Number(input._value)
  const result = inputNumber * 1e6
  return Number(result.toFixed(6))
}

export function getReqdLeverage(sizeDelta: number, marginDelta: number, price: number) {
  if (marginDelta <= 0 || marginDelta > 20) throw new Error(HL_LEV_OUT_OF_BOUNDS)

  return Math.round((sizeDelta * price) / marginDelta)
}

export function getReqdLeverageFN(sizeDelta: FixedNumber, marginDelta: FixedNumber, price: FixedNumber) {
  const px = Number(price._value)
  const sd = Number(sizeDelta._value)
  const md = Number(marginDelta._value)

  if (md <= 0 || md > 20) throw new Error(HL_LEV_OUT_OF_BOUNDS)

  return Math.round((sd * px) / md)
}
