export type Meta = {
  universe: Universe[]
}

export type Universe = {
  maxLeverage: number
  name: string
  onlyIsolated: boolean
  szDecimals: number
}

export type AllMids = Record<string, string>

export type MetaAndAssetCtx = [Meta, AssetCtx[]]

export type AssetCtx = {
  dayNtlVlm: string
  funding: string // Hourly funding rate
  impactPxs: string[]
  markPx: string
  midPx: string
  openInterest: string
  oraclePx: string
  premium: string
  prevDayPx: string
}

export type ClearinghouseState = {
  assetPositions: AssetPosition[]
  crossMaintenanceMarginUsed: string
  crossMarginSummary: MarginSummary
  marginSummary: MarginSummary
  time: number
  withdrawable: string
}

export type AssetPosition = {
  position: Position
  type: string
}

export type Position = {
  coin: string
  cumFunding: CumFunding
  entryPx: string
  leverage: Leverage
  liquidationPx: string | null
  marginUsed: string
  maxLeverage: number
  positionValue: string
  returnOnEquity: string
  szi: string
  unrealizedPnl: string
}

export type CumFunding = {
  allTime: string
  sinceChange: string
  sinceOpen: string
}

export type Leverage = {
  rawUsd: string
  type: string
  value: number
}

export type MarginSummary = {
  accountValue: string
  totalMarginUsed: string
  totalNtlPos: string
  totalRawUsd: string
}

export type OpenOrders = {
  coin: string
  limitPx: string
  oid: number
  origSz: string
  reduceOnly: boolean | undefined
  side: Side
  sz: string
  timestamp: number
}

export type Side = 'B' | 'A'

export type UserFill = {
  closedPnl: string
  coin: string
  crossed: boolean
  dir: Operation
  fee: string
  hash: string
  liquidationMarkPx: null | string
  oid: number
  px: string
  side: Side
  startPosition: string
  sz: string
  tid: number
  time: number
}

export type Operation = 'Open Long' | 'Close Long' | 'Close Short' | 'Open Short'

export type UserFunding = {
  delta: Delta
  hash: string
  time: number
}

export type Delta = {
  coin: string
  fundingRate: string
  szi: string
  type: Type
  usdc: string
}

export type Type = 'funding'

export type FundingHistory = {
  coin: string
  fundingRate: string
  premium: string
  time: number
}

export type L2Book = {
  coin: string
  levels: Array<Level[]>
  time: number
}

export type Level = {
  n: number
  px: string
  sz: string
}

export type OrderStatusInfo = {
  order: Order
  status: string // TODO - check possible types (order etc)
}

export type Order = {
  order: OrderData
  status: string // TODO - check possible types (open, close etc)
  statusTimestamp: number
}

export type HlOrderType = 'Limit' | 'Stop Market' | 'Stop Limit' | 'Take Profit Market' | 'Take Profit Limit'

export type OrderData = {
  children: any[]
  cloid: null | number
  coin: string
  isPositionTpsl: boolean
  isTrigger: boolean
  limitPx: string
  oid: number
  orderType: HlOrderType
  origSz: string
  reduceOnly: boolean
  side: Side
  sz: string
  tif: string | null // TODO - check possible types (GTC, IOC etc)
  timestamp: number
  triggerCondition: string
  triggerPx: string
}
