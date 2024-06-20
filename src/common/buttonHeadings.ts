import { CloseOrderType, ProtocolId, TradeDirection } from '../interfaces/V1/IRouterAdapterBaseV1'

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
  return `${_getDirectionString(direction)} ${_getMarketSymbol(marketSymbol)} on ${_getProtocolString(protocolId)}`
}

export function getClosePositionHeading(protocolId: ProtocolId, marketSymbol: string, type: CloseOrderType) {
  if (type == 'MARKET') return `Close ${_getMarketSymbol(marketSymbol)} on ${_getProtocolString(protocolId)}`
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

function _getMarketSymbol(marketSymbol: string) {
  if (marketSymbol == 'WETH') {
    return 'ETH'
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

// AEVO
export const AEVO_ENABLE_TRADING_H = 'Aevo: Enable Trading'
export const AEVO_DEPOSIT_H = 'Aevo: Deposit'
export const AEVO_WITHDRAW_H = 'Aevo: Withdraw'
export const AEVO_UPDATE_LEVERAGE_H = 'Update Leverage'
export const AEVO_MULTIPLE_POSITION_H = 'Multiple Position Update'
export const AEVO_EARN = 'Aevo: Earn'
export const AEVO_REDEEM = 'Aevo: Redeem'
export const AEVO_SET_REF_H = 'Aevo: Set Referrer'
export const AEVO_REGISTER_H = 'Aevo: Register'

// ORDERLY
export const ORDERLY_REGISTER_H = 'Orderly: Register'
export const ORDERLY_CREATE_KEY_H = 'Orderly: Create Key'
export const ORDERLY_APPROVE_H = 'Orderly: Approve'
export const ORDERLY_DEPOSIT_H = 'Orderly: Deposit'
export const ORDERLY_WITHDRAW_H = 'Orderly: Withdraw'
export const ORDERLY_SETTLE_PNL_H = 'Orderly: Settle PnL'
