import { Token } from '../../common/tokens'
import { amount_step_response } from '../../../generated/aevo/models/amount_step_response'
import { delta_response } from '../../../generated/aevo/models/delta_response'
import { expiry_response } from '../../../generated/aevo/models/expiry_response'
import { forward_price_response } from '../../../generated/aevo/models/forward_price_response'
import { gamma_response } from '../../../generated/aevo/models/gamma_response'
import { index_price_response } from '../../../generated/aevo/models/index_price_response'
import { instrument_id_response } from '../../../generated/aevo/models/instrument_id_response'
import { instrument_name_response } from '../../../generated/aevo/models/instrument_name_response'
import { instrument_type_response } from '../../../generated/aevo/models/instrument_type_response'
import { is_active_response } from '../../../generated/aevo/models/is_active_response'
import { iv_response } from '../../../generated/aevo/models/iv_response'
import { mark_price_response } from '../../../generated/aevo/models/mark_price_response'
import { max_leverage_response } from '../../../generated/aevo/models/max_leverage_response'
import { max_notional_value_response } from '../../../generated/aevo/models/max_notional_value_response'
import { max_order_value_response } from '../../../generated/aevo/models/max_order_value_response'
import { min_order_value_response } from '../../../generated/aevo/models/min_order_value_response'
import { option_type_response } from '../../../generated/aevo/models/option_type_response'
import { pre_launch_response } from '../../../generated/aevo/models/pre_launch_response'
import { price_step_response } from '../../../generated/aevo/models/price_step_response'
import { quote_asset_response } from '../../../generated/aevo/models/quote_asset_response'
import { rho_response } from '../../../generated/aevo/models/rho_response'
import { strike_response } from '../../../generated/aevo/models/strike_response'
import { theta_response } from '../../../generated/aevo/models/theta_response'
import { underlying_asset_response } from '../../../generated/aevo/models/underlying_asset_response'
import { vega_response } from '../../../generated/aevo/models/vega_response'
import { arbitrum } from 'viem/chains'

export const aevo = arbitrum
export const AEVO_TOKENS_MAP: Record<string, Token> = {}
export const AEVO_COLLATERAL_TOKEN = {
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  address: {
    42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    10: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607'
  }
} as Token

export function aevoUpdateTokensMap(
  allMarkets: Array<{
    instrument_id: instrument_id_response
    instrument_name: instrument_name_response
    instrument_type: instrument_type_response
    underlying_asset: underlying_asset_response
    quote_asset: quote_asset_response
    price_step: price_step_response
    amount_step: amount_step_response
    min_order_value: min_order_value_response
    max_order_value: max_order_value_response
    max_notional_value: max_notional_value_response
    mark_price: mark_price_response
    forward_price?: forward_price_response
    index_price: index_price_response
    is_active: is_active_response
    option_type?: option_type_response
    expiry?: expiry_response
    strike?: strike_response
    greeks?: {
      delta: delta_response
      gamma: gamma_response
      rho: rho_response
      theta: theta_response
      vega: vega_response
      iv: iv_response
    }
    max_leverage?: max_leverage_response
    pre_launch?: pre_launch_response
  }>
) {
  allMarkets.forEach((m) => {
    AEVO_TOKENS_MAP[m.underlying_asset] = {
      symbol: m.underlying_asset,
      name: m.underlying_asset,
      decimals: _decimalsIn(m.amount_step),
      address: {
        42161: undefined,
        10: undefined
      }
    }
  })
}

function _decimalsIn(number: string): number {
  const [, decimal] = number.split('.')
  if (decimal && decimal != '') {
    return decimal.length
  } else {
    return 0
  }
}
