import type { CloseOrderType, ProtocolId, TradeDirection } from '../interfaces/V1/IRouterAdapterBaseV1'

export const EMPTY_DESC = ''
export const GMXV1_ENABLE_ORDERBOOK_H = 'GMXv1: Enable Limit Orders'
export const GMXV1_ENABLE_POSITION_ROUTER_H = 'GMXv1: Enable Market Orders'
export const GMX_SET_REFERRAL_CODE_H = 'GMX: Set Referral Code'
export const UPDATE_ORDER_H = 'Edit Price'
export const CANCEL_ORDER_H = 'Cancel Order'
export const UPDATE_DEPOSIT_H = 'Add Collateral'
export const UPDATE_WITHDRAW_H = 'Remove Collateral'
export const CLOSE_POSITION_H = 'Close Position'
export const GMXV2_CLAIM_FUNDING_H = 'GMXv2: Claim Funding'
export const SYN_V2_DEPOSIT_H = 'SNXv2: Deposit'
export const SYN_V2_WITHDRAW_H = 'SNXv2: Withdraw'

export function getIncreasePositionHeading(protocolId: ProtocolId, direction: TradeDirection, marketSymbol: string) {
  return `${_getDirectionString(direction)} ${_getMarketSymbol(marketSymbol, protocolId)} on ${_getProtocolString(
    protocolId
  )}`
}

export function getClosePositionHeading(protocolId: ProtocolId, marketSymbol: string, type: CloseOrderType) {
  if (type == 'MARKET')
    return `Close ${_getMarketSymbol(marketSymbol, protocolId)} on ${_getProtocolString(protocolId)}`
  else return `Open ${_getTPSLString(type)} on ${_getProtocolString(protocolId)}`
}

export function getApproveTokenHeading(tokenSymbol: string) {
  return `Approve ${_getTokenSymbol(tokenSymbol)} Collateral`
}

function _getTPSLString(type: CloseOrderType) {
  switch (type) {
    case 'STOP_LOSS':
      return 'SL'
    case 'TAKE_PROFIT':
      return 'TP'
    default:
      return ''
  }
}

function _getMarketSymbol(marketSymbol: string, protocolId: ProtocolId) {
  if (marketSymbol == 'WETH') {
    return 'ETH'
  }
  if (protocolId === 'SYNFUTURES' && marketSymbol.includes('-')) {
    return marketSymbol.split('-')[0] + '/' + marketSymbol.split('-')[1]
  }
  return marketSymbol
}

function _getTokenSymbol(tokenSymbol: string) {
  if (tokenSymbol == 'WBTC.b') {
    return 'WBTC'
  }
  return tokenSymbol
}

function _getDirectionString(direction: TradeDirection) {
  switch (direction) {
    case 'LONG':
      return 'Long'
    case 'SHORT':
      return 'Short'
    default:
      return ''
  }
}

function _getProtocolString(protocolId: ProtocolId) {
  switch (protocolId) {
    case 'GMXV1':
      return 'GMXv1'
    case 'GMXV2':
      return 'GMXv2'
    case 'SYNTHETIX_V2':
      return 'SNXv2'
    case 'HL':
      return 'Hyperliquid'
    case 'AEVO':
      return 'Aevo'
    case 'DYDXV4':
      return 'dYdX'
    case 'SYNFUTURES':
      return 'SynFutures'
    case 'PERENNIAL':
      return 'Perennial'
    case 'REYA':
      return 'Reya'
    default:
      return ''
  }
}

// HYPERLIQUID
export const HYPERLIQUID_ENABLE_TRADING_H = 'Hyperliquid: Enable Trading'
export const HYPERLIQUID_DEPOSIT_H = 'Hyperliquid: Deposit'
export const HYPERLIQUID_WITHDRAW_H = 'Hyperliquid: Withdraw'
export const HYPERLIQUID_UPDATE_ORDER_H = 'Update Order'
export const HYPERLIQUID_UPDATE_LEVERAGE_H = 'Update Leverage'
export const HYPERLIQUID_UPDATE_MARGIN_H = 'Update Margin'
export const HYPERLIQUID_MULTIPLE_POSITION_H = 'Multiple Position Update'
export const HYPERLIQUID_SET_REF_H = 'Hyperliquid: Set Referrer'
export const HYPERLIQUID_SPOT_PERP_TRANSFER = 'Hyperliquid: Transfer between Spot & Perp'

// AEVO
export const AEVO_ENABLE_TRADING_H = 'Aevo: Enable Trading'
export const AEVO_DEPOSIT_H = 'Aevo: Deposit'
export const AEVO_WITHDRAW_H = 'Aevo: Withdraw'
export const AEVO_UPDATE_LEVERAGE_H = 'Update Leverage'
export const AEVO_MULTIPLE_POSITION_H = 'Multiple Position Update'
export const AEVO_EARN = 'Aevo: Earn'
export const AEVO_REDEEM = 'Aevo: Redeem'

// DYDX
export const DYDX_DEPOSIT = 'dYdX: Deposit'
export const DYDX_WITHDRAW = 'dYdX: Withdraw'
export const DYDX_DERIVE_ONBOARDING = 'dYdX: Onboard'
export const DYDX_UPDATE_ORDER_H = 'Update Order'

// SYNFUTURES
export const SYNFUTURES_DEPOSIT = 'SynFutures: Deposit'
export const SYNFUTURES_WITHDRAW = 'SynFutures: Withdraw'

// PERENNIAL
export const PERENNIAL_DEPOSIT = 'Perennial: Deposit'
export const PERENNIAL_WITHDRAW = 'Perennial: Withdraw'
export const PERENNIAL_UPDATE_MARGIN = 'Update Margin'
export const PERENNIAL_APPROVE_MARKET = 'Enable Perennial: Approve Market'

// Reya
export const REYA_DEPOSIT = 'Reya: Deposit'
export const REYA_WITHDRAW = 'Reya: Withdraw'
export const REYA_TRADE = 'Reya: Trade'
