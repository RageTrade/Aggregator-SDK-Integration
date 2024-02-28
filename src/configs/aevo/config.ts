import { Token } from '../../common/tokens'
import { arbitrum } from 'viem/chains'
import { AevoClient } from '../../../generated/aevo'
import { FixedNumber } from '../../common/fixedNumber'

export const aevo = arbitrum
export const AEVO_TOKENS_MAP: Record<
  string,
  Token & {
    instrumentId: string
    isPreLaunch: boolean
  }
> = {}
export const AEVO_COLLATERAL_TOKEN = {
  symbol: 'AEVO-USD',
  name: 'Aevo USD',
  decimals: 6,
  address: {
    42161: undefined,
    10: undefined
  }
} as Token

export const AEVO_DEFAULT_TAKER_FEE = '0.0008'
export const AEVO_DEFAULT_MAKER_FEE = '0.0005'
export const AEVO_DEFAULT_TAKER_FEE_PRE_LAUNCH = '0.0025'
export const AEVO_DEFAULT_MAKER_FEE_PRE_LAUNCH = '-0.0015'

export const AEVO_NORMAL_MM = FixedNumber.fromString('0.03') // 3%
export const AEVO_PRE_LAUNCH_MM = FixedNumber.fromString('0.48') // 48%

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

type AllMarketsReturn = Awaited<ReturnType<(typeof AevoClient)['prototype']['publicApi']['getMarkets']>>

export function aevoUpdateTokensMap(allMarkets: AllMarketsReturn) {
  allMarkets.forEach((m) => {
    AEVO_TOKENS_MAP[m.underlying_asset] = {
      symbol: m.underlying_asset,
      name: m.underlying_asset,
      decimals: 18,
      address: {
        42161: undefined,
        10: undefined
      },
      instrumentId: m.instrument_id,
      isPreLaunch: m.pre_launch ? true : false
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
