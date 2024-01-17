import { ProtocolId, TradeDirection } from '../interfaces/V1/IRouterAdapterBaseV1'

export const EMPTY_DESC = ''
export const GMXV1_ENABLE_ORDERBOOK_H = 'GMXv1: Enable Limit Orders'
export const GMXV1_ENABLE_POSITION_ROUTER_H = 'GMXv1: Enable Market Orders'
export const GMX_SET_REFERRAL_CODE_H = 'GMX: Set Referral Code'
export const TOKEN_APPROVAL_H = 'Approve Collateral'
export const UPDATE_ORDER_H = 'Edit Price'
export const CANCEL_ORDER_H = 'Cancel Order'
export const UPDATE_DEPOSIT_H = 'Add Collateral'
export const UPDATE_WITHDRAW_H = 'Remove Collateral'
export const CLOSE_POSITION_H = 'Close Position'
export const GMXV2_CLAIM_FUNDING_H = 'GMXv2: Claim Funding'
export const SYN_V2_DEPOSIT_H = 'SNXv2: Deposit'
export const SYN_V2_WITHDRAW_H = 'SNXv2: Withdraw'

export function getIncreasePositionHeading(protocolId: ProtocolId, direction: TradeDirection, marketSymbol: string) {
  return `${direction} ${marketSymbol} on ${protocolId}`
}

export function getClosePositionHeading(protocolId: ProtocolId, marketSymbol: string) {
  return `Close ${marketSymbol} on ${protocolId}`
}
