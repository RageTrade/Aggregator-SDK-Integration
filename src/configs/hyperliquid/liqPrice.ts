// This snippet shows a function that can be used to compute the
// cross or isolated liquidation price given order inputs and market data.

enum Side {
  Bid,
  Ask
}

export type HlLeverage = CrossLeverage | IsolatedLeverage
type CrossLeverage = {
  type: 'cross'
  value: number
  rawUsd?: number
}
type IsolatedLeverage = {
  type: 'isolated'
  value: number
  rawUsd: number
}

interface Position {
  coin: string
  szi: number
  leverage: HlLeverage
  entryPx: number
  positionValue: number
  unrealizedPnl: number
  returnOnEquity: number
  liquidationPx: number | null
  marginUsed: number
  maxLeverage: number
}

type AssetPosition = { type: 'oneWay'; position: Position }

interface Meta {
  universe: Array<AssetInfo>
}

interface AssetInfo {
  name: string
  szDecimals: number
  maxLeverage: number
  onlyIsolated: boolean
}

interface MarginSummary {
  accountValue: number
  totalNtlPos: number
  totalRawUsd: number
  totalMarginUsed: number
}

interface ClearinghouseState {
  assetPositions: Array<AssetPosition>
  crossMarginSummary: MarginSummary
  crossMaintenanceMarginUsed: number
}

interface WebData {
  clearinghouseState: ClearinghouseState
  meta: Meta
  assetCtxs: Array<AssetCtx>
}

interface AssetCtx {
  dayNtlVlm: number
  funding: number
  openInterest: number
  prevDayPx: number
  oraclePx: number
  markPx: number
}

function parseSide(isBuy: boolean): any {
  if (isBuy) {
    return {
      name: 'Long',
      side: Side.Bid,
      floatSide: 1
    }
  }

  return {
    name: 'Short',
    side: Side.Ask,
    floatSide: -1
  }
}

const FLOAT_REGEX = /^-?(?!0\d)\d+(?:\.\d*)?$/
const KEYS_TO_SKIP = ['displayName', 'name']
function parseJsonUnquotingFloatString(s: string) {
  const convertFloatStringsToNumbers = function (obj: any): any {
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (KEYS_TO_SKIP.includes(key)) {
          continue
        }
        obj[key] = convertFloatStringsToNumbers(obj[key])
      }
    } else if (typeof obj === 'string' && obj.match(FLOAT_REGEX)) {
      return parseFloat(obj)
    }
    return obj
  }
  return convertFloatStringsToNumbers(JSON.parse(s))
}

const COIN_NOT_FOUND = 1000000
function coinToAsset(coin: string, universe: Array<AssetInfo>): number {
  for (let i = 0; i < universe.length; ++i) {
    if (universe[i]?.name === coin) {
      return i
    }
  }
  return COIN_NOT_FOUND
}

function coinPosition(coin: string, assetPositions: Array<AssetPosition>): Position | undefined {
  for (let i = 0; i < assetPositions.length; ++i) {
    if (assetPositions[i]?.position.coin === coin) {
      return assetPositions[i]?.position
    }
  }
  return undefined
}

function getIsolatedLiquidationPrice(
  mid: number,
  floatSide: number,
  leverage: number,
  levRawUsd: number,
  positionSzi: number,
  userSz: number,
  totalNtlPos: number,
  updatedPosition: number,
  maxLeverage: number
): number | null {
  let userSzi = floatSide * userSz
  let rawUsd = levRawUsd
  {
    const isTradeLong = userSzi > 0
    const isPosLong = positionSzi > 0
    const isOffsetting = isTradeLong !== isPosLong
    if (positionSzi !== 0 && isOffsetting) {
      const decreaseSz = Math.min(Math.abs(userSzi), Math.abs(positionSzi))
      const decreaseSzi = userSzi < 0 ? -decreaseSz : decreaseSz
      const originalPosAbs = Math.abs(positionSzi)
      const ntli = mid * positionSzi
      const adjustment = (rawUsd + ntli) * (decreaseSz / originalPosAbs)

      rawUsd -= adjustment

      userSzi -= decreaseSzi
      positionSzi += decreaseSzi
      rawUsd -= mid * decreaseSzi
    }
  }

  {
    const isTradeLong = userSzi > 0
    const isPosLong = positionSzi > 0
    const isIncreasingPos = isTradeLong === isPosLong
    if (positionSzi === 0 || isIncreasingPos) {
      const ntl = Math.abs(mid * userSzi)
      const margin = ntl / leverage
      rawUsd += margin
      positionSzi += userSzi
      rawUsd -= mid * userSzi
    }
  }

  if (positionSzi === 0) {
    rawUsd = 0
  }
  const ntli = updatedPosition * mid
  const accountValue = ntli + rawUsd
  const updatedPosSideFloat = updatedPosition > 0 ? 1.0 : -1.0
  const correction = 1 - floatSide / maxToMaintenanceLeverage(maxLeverage)
  const liquidationPrice =
    mid -
    (updatedPosSideFloat * (accountValue - totalNtlPos / maxToMaintenanceLeverage(maxLeverage))) /
      Math.abs(updatedPosition) /
      correction

  if (liquidationPrice <= 0 || liquidationPrice > 1e15 || updatedPosition === 0) {
    return null
  } else {
    return liquidationPrice
  }
}

function getCrossLiquidationPrice(
  markPx: number,
  floatSide: number,
  liveAccountValue: number,
  totalNtlPos: number,
  absPosition: number,
  maxLeverage: number
): number | null {
  const correction = 1 - floatSide / maxToMaintenanceLeverage(maxLeverage)
  const liquidationPrice =
    markPx -
    (floatSide * (liveAccountValue - totalNtlPos / maxToMaintenanceLeverage(maxLeverage))) / absPosition / correction

  if (liquidationPrice <= 0 || liquidationPrice > 1e15 || absPosition === 0) {
    return null
  } else {
    return liquidationPrice
  }
}

function maxToMaintenanceLeverage(maxLeverage: number): number {
  return maxLeverage * 2
}

export function estLiqPrice(
  address: string,
  mid: number,
  leverage: number,
  isIsolated: boolean,
  userSz: number,
  userLimitPx: number,
  isLong: boolean,
  activeCoin: string,
  webData2: string,
  addIsolatedMarginAmt: number
): number | null {
  const webData: WebData = parseJsonUnquotingFloatString(webData2)
  const {
    clearinghouseState: { assetPositions },
    meta,
    assetCtxs
  } = webData

  const asset = coinToAsset(activeCoin, meta.universe)
  const position = coinPosition(activeCoin, assetPositions)

  const assetCtx = assetCtxs[asset]
  const maxLeverage = position?.maxLeverage ?? meta.universe[asset]?.maxLeverage
  if (assetCtx === undefined || maxLeverage === undefined || leverage === null) {
    console.log('Missing data for liquidation px, returning null', mid, assetCtx, maxLeverage, leverage, asset)
    return null
  }
  const szi = position?.szi ?? 0
  const { accountValue } = webData.clearinghouseState.crossMarginSummary
  const crossMaintenanceMarginUsed = webData.clearinghouseState.crossMaintenanceMarginUsed

  const { floatSide } = parseSide(isLong)

  const updatedPosition = szi + floatSide * userSz
  const absUpdatedPosition = Math.abs(updatedPosition)
  let markPx = assetCtx['markPx']

  const crossMaintenanceMarginRemaining =
    accountValue - crossMaintenanceMarginUsed + (Math.abs(szi) * markPx) / maxToMaintenanceLeverage(maxLeverage)

  if (userLimitPx > markPx !== isLong) {
    markPx = userLimitPx
  }
  const totalNtlPos = userLimitPx * absUpdatedPosition
  const { floatSide: positionSide } = parseSide(updatedPosition > 0)
  const rawUsd = position?.leverage?.rawUsd ?? 0
  const updatedRawUsd = rawUsd + addIsolatedMarginAmt

  const liqPx = isIsolated
    ? getIsolatedLiquidationPrice(
        markPx,
        floatSide,
        leverage,
        updatedRawUsd,
        szi,
        userSz,
        totalNtlPos,
        updatedPosition,
        maxLeverage
      )
    : getCrossLiquidationPrice(
        markPx,
        positionSide,
        Math.max(crossMaintenanceMarginRemaining, totalNtlPos / leverage),
        totalNtlPos,
        absUpdatedPosition,
        maxLeverage
      )

  // console.log('liquidation px:', liqPx)
  return liqPx
}
