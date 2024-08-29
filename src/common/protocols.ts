import type { Chain } from 'viem'
import { arbitrum, optimism } from 'viem/chains'

export interface Protocol {
  symbol: string
  supportedChains: Chain[]
}

export const protocols = {
  GMXV1: {
    symbol: 'GMXV1',
    supportedChains: [arbitrum]
  },
  SNXV2: {
    symbol: 'SYNTHETIX_V2',
    supportedChains: [optimism]
  },
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
  REYA: {
    symbol: 'REYA',
    supportedChains: [arbitrum, optimism]
  }
} as const
