export type OrderlyPaginationMeta = {
  current_page: number
  records_per_page: number
  total: number
}

export type OrderlyLiquidationInfo = {
  liquidation_id: number
  positions_by_perp: OrderlyLiquidatedPosition[]
  timestamp: number
  transfer_amount_to_insurance_fund: number
}

export type OrderlyLiquidatedPosition = {
  abs_liquidator_fee: number
  cost_position_transfer: number
  liquidator_fee: number
  position_qty: number
  symbol: string
  transfer_price: number
}

export type NonUSDCHolding = {
  holding: number
  markPrice: number
  discount: number
}
