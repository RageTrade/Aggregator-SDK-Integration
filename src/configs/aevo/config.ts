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

export const AEVO_FEE_MAP: Record<string, { taker_fee: string; maker_fee: string }> = {
  '10000SATS': {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  '1000BONK': {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  '1000PEPE': {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  ALT: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  APT: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  ARB: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  ATOM: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  AVAX: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  BANANA: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  BEAM: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  BEAMX: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  BITCOIN: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  BLAST: {
    taker_fee: '0.0025',
    maker_fee: '-0.0015'
  },
  BLUR: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  BLZ: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  BNB: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  BTC: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  CANTO: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  CRV: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  DOGE: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  DYDX: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  DYM: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  ETH: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  FRIEND: {
    taker_fee: '0.001',
    maker_fee: '0.0005'
  },
  GLMR: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  HIFI: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  HPOS: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  ILV: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  INJ: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  JITO: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  JUP: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  LDO: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  LINK: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  MANTA: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  MATIC: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  MEME: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  MINA: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  MKR: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  NMR: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  NTRN: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  OP: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  ORDI: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  OX: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  PIXEL: {
    taker_fee: '0.0025',
    maker_fee: '-0.0015'
  },
  PRIME: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  PYTH: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  RNDR: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  SEI: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  SOL: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  STRAX: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  SUI: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  SYN: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  T: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  TAO: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  TIA: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  TRB: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  TRX: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  UMA: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  WLD: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  XRP: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  },
  ZETA: {
    taker_fee: '0.0008',
    maker_fee: '0.0005'
  }
}

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
