import type { Chain } from 'viem'
import { arbitrum, optimism } from 'viem/chains'

import type { ProtocolId } from '../interfaces'

export interface Protocol {
  symbol: ProtocolId
  supportedChains: Chain[]
}

export const protocols: Record<string, Protocol> = {
  GMXV2: {
    symbol: 'GMXV2',
    supportedChains: [arbitrum]
  },
  HYPERLIQUID: {
    symbol: 'HL',
    supportedChains: [arbitrum]
  },
  AEVO: {
    symbol: 'AEVO',
    supportedChains: [arbitrum, optimism]
  },
  DYDXV4: {
    symbol: 'DYDXV4',
    supportedChains: [arbitrum, optimism]
  },
  PERENNIAL: {
    symbol: 'PERENNIAL',
    supportedChains: [arbitrum]
  },
  SYNFUTURES: {
    symbol: 'SYNFUTURES',
    supportedChains: [arbitrum]
  },
  ORDERLY: {
    symbol: 'ORDERLY',
    supportedChains: [arbitrum]
  },
  REYA: {
    symbol: 'REYA',
    supportedChains: [arbitrum, optimism]
  }
} as const
