import { FixedNumber, abs, bipsDiff, addFN, mulFN, divFN, subFN } from '../../common/fixedNumber'
import { countSignificantDigits, precisionFromNumber } from '../../common/helper'
import { OBData, OBLevel } from '../../interfaces/V1/IRouterAdapterBaseV1'
import { LEV_OUT_OF_BOUNDS } from '../hyperliquid/hlErrors'
import { AevoWssOrderBook } from './aevoWsClient'
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
  return Math.round(result)
}

export function to6DecimalsFN(input: FixedNumber): number {
  const inputNumber = Number(input._value)
  const result = inputNumber * 1e6
  return Math.round(result)
}

export function toNearestTick(input: number, tickSize: number): number {
  if (tickSize <= 0) {
    throw new Error('Tick size must be greater than zero')
  }

  return Math.round(input / tickSize) * tickSize
}

export function toLowerTick(input: number, tickSize: number): number {
  if (tickSize <= 0) {
    throw new Error('Tick size must be greater than zero')
  }

  return Math.floor(input / tickSize) * tickSize
}

export function getReqdLeverage(sizeDelta: number, marginDelta: number, price: number) {
  if (marginDelta <= 0) throw new Error(LEV_OUT_OF_BOUNDS)

  return Math.round((sizeDelta * price) / marginDelta)
}

export function getReqdLeverageFN(sizeDelta: FixedNumber, marginDelta: FixedNumber, price: FixedNumber) {
  const px = Number(price._value)
  const sd = Number(sizeDelta._value)
  const md = Number(marginDelta._value)

  if (md <= 0) throw new Error(LEV_OUT_OF_BOUNDS)

  return Math.round((sd * px) / md)
}

export function aevoMapLevelsToObLevels(levels: NonNullable<AevoWssOrderBook['asks']>): OBLevel[] {
  const obLevels: OBLevel[] = []
  let totalSz = FixedNumber.fromString('0')
  let totalSzUsd = FixedNumber.fromString('0')
  for (const level of levels) {
    const price = FixedNumber.fromString(level[0])
    const sizeToken = FixedNumber.fromString(level[1])
    const sizeUsd = price.mulFN(sizeToken)
    totalSz = totalSz.addFN(sizeToken)
    totalSzUsd = totalSzUsd.addFN(sizeUsd)
    obLevels.push({
      price: FixedNumber.fromString(level[0]),
      sizeToken: FixedNumber.fromString(level[1]),
      sizeUsd: sizeUsd,
      totalSizeToken: totalSz,
      totalSizeUsd: totalSzUsd
    })
  }

  return obLevels
}

export function aevoMapAevoObToObData(ob: AevoWssOrderBook): OBData {
  const bids = ob.bids ? aevoMapLevelsToObLevels(ob.bids) : []
  const asks = ob.asks ? aevoMapLevelsToObLevels(ob.asks) : []

  const spread = asks[0].price.subFN(bids[0].price)
  const spreadPercent = spread.divFN(asks[0].price).mulFN(FixedNumber.fromString('100'))

  const obData: OBData = {
    actualPrecision: _calcActualPrecision(bids, asks),
    bids: bids,
    asks: asks,
    spread: spread,
    spreadPercent: spreadPercent
  }

  return obData
}

function _calcActualPrecision(bids: OBLevel[], asks: OBLevel[]): FixedNumber {
  let mostPrecisePrice = 0
  let maxSigFigs = 0

  for (const level of bids) {
    const price = Number(level.price.toString())
    const sigFigs = countSignificantDigits(price)
    if (sigFigs > maxSigFigs) {
      maxSigFigs = sigFigs
      mostPrecisePrice = price
    }
  }

  for (const level of asks) {
    const price = Number(level.price.toString())
    const sigFigs = countSignificantDigits(price)
    if (sigFigs > maxSigFigs) {
      maxSigFigs = sigFigs
      mostPrecisePrice = price
    }
  }

  return FixedNumber.fromString(precisionFromNumber(mostPrecisePrice).toString())
}
