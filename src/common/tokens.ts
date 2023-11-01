import { arbitrum, optimism } from 'viem/chains'

type Maybe<T> = T | undefined

export interface Token {
    symbol: string
    name: string
    decimals: number
    address: {
      [arbitrum.id]: Maybe<`0x${string}`>
      [optimism.id]: Maybe<`0x${string}`>
    }
  }

export const tokens = {
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    address: {
      [arbitrum.id]: '0x0000000000000000000000000000000000000000',
      [optimism.id]: '0x0000000000000000000000000000000000000000'
    }
  },
  'USDC.e': {
    symbol: 'USDC.e',
    name: ' Bridged USDC',
    decimals: 6,
    address: {
      [arbitrum.id]: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      [optimism.id]: undefined
    }
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    address: {
      [arbitrum.id]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      [optimism.id]: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607'
    }
  },
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped ETH',
    decimals: 18,
    address: {
      [arbitrum.id]: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      [optimism.id]: '0x4200000000000000000000000000000000000006'
    }
  },
  sUSD: {
    symbol: 'sUSD',
    name: 'Synth sUSD',
    decimals: 18,
    address: {
      [arbitrum.id]: '0xA970AF1a584579B618be4d69aD6F73459D112F95',
      [optimism.id]: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9'
    }
  },
  BTC: {
    symbol: 'BTC',
    name: 'Wrapped BTC',
    decimals: 8,
    address: {
      [arbitrum.id]: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
      [optimism.id]: '0x68f180fcCe6836688e9084f035309E29Bf0A2095'
    }
  },
  LINK: {
    symbol: 'LINK',
    name: 'Chainlink',
    decimals: 18,
    address: {
      [arbitrum.id]: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
      [optimism.id]: '0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6'
    }
  },
  UNI: {
    symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18,
    address: {
      [arbitrum.id]: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
      [optimism.id]: '0x6fd9d7AD17242c41f7131d257212c54A0e816691'
    }
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether',
    decimals: 6,
    address: {
      [arbitrum.id]: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      [optimism.id]: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
    }
  },
  DAI: {
    symbol: 'DAI',
    name: 'Dai',
    decimals: 18,
    address: {
      [arbitrum.id]: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      [optimism.id]: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  ARB: {
    symbol: 'ARB',
    name: 'Arbitrum',
    decimals: 18,
    address: {
      [arbitrum.id]: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      [optimism.id]: undefined
    }
  },
  FRAX: {
    symbol: 'FRAX',
    name: 'FRAX',
    decimals: 18,
    address: {
      [arbitrum.id]: '0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F',
      [optimism.id]: '0x2E3D870790dC77A83DD1d18184Acc7439A53f475'
    }
  },
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    decimals: 18,
    address: {
      [arbitrum.id]: '0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F',
      [optimism.id]: '0x2E3D870790dC77A83DD1d18184Acc7439A53f475'
    }
  },
  MATIC: {
    symbol: 'MATIC',
    name: 'MATIC',
    decimals: 18,
    address: {
      [arbitrum.id]: '0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F',
      [optimism.id]: '0x2E3D870790dC77A83DD1d18184Acc7439A53f475'
    }
  }
} as const satisfies Record<string, Token>

export type TokenSymbol = keyof typeof tokens

export const ListedTokens = Object.values(tokens)

export function getTokenBySymbol(symbol: TokenSymbol) {
  return tokens[symbol] as Token
}
