import { Token } from '../common/tokens'
import { arbitrum, optimism } from 'viem/chains'
import { ethers } from 'ethers'

const tokens = [
  {
    symbol: 'ETH',
    address: ethers.constants.AddressZero,
    decimals: 18
  },
  {
    symbol: 'WETH',
    address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    decimals: 18
  },
  {
    symbol: 'BTC',
    address: '0x47904963fc8b2340414262125aF798B9655E58Cd',
    decimals: 8,
    synthetic: true
  },
  {
    symbol: 'WBTC.b',
    address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    decimals: 8
  },
  {
    symbol: 'DOGE',
    address: '0xC4da4c24fd591125c3F47b340b6f4f76111883d8',
    decimals: 8,
    synthetic: true
  },
  {
    symbol: 'LTC',
    address: '0xB46A094Bc4B0adBD801E14b9DB95e05E28962764',
    decimals: 8,
    synthetic: true
  },
  {
    symbol: 'SOL',
    address: '0x2bcC6D6CdBbDC0a4071e48bb3B969b06B3330c07',
    decimals: 9
  },
  {
    symbol: 'UNI',
    address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
    decimals: 18
  },
  {
    symbol: 'LINK',
    address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
    decimals: 18
  },
  {
    symbol: 'ARB',
    address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    decimals: 18
  },
  {
    symbol: 'XRP',
    address: '0xc14e065b0067dE91534e032868f5Ac6ecf2c6868',
    decimals: 6,
    synthetic: true
  },
  {
    symbol: 'USDC',
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    decimals: 6
  },
  {
    symbol: 'USDC.e',
    address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    decimals: 6
  },
  {
    symbol: 'USDT',
    address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    decimals: 6
  },
  {
    symbol: 'DAI',
    address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    decimals: 18
  }
]

export const GMX_V2_TOKENS: { [key: string]: Token } = {}

tokens.forEach((token) => {
  GMX_V2_TOKENS[token.symbol] = {
    symbol: token.symbol,
    name: token.symbol,
    decimals: token.decimals,
    address: {
      [arbitrum.id]: token.address,
      [optimism.id]: undefined
    }
  } as Token
})

export const getGmxV2TokenBySymbol = (symbol: string): Token => {
  if (!GMX_V2_TOKENS[symbol]) throw new Error(`Token ${symbol} not found`)

  return GMX_V2_TOKENS[symbol]
}

export const getGmxV2TokenByAddress = (address: string): Token => {
  const token = Object.values(GMX_V2_TOKENS).find(
    (t) => t.address[arbitrum.id]?.toLowerCase() === address.toLowerCase()
  )
  if (!token) throw new Error(`Token ${address} not found`)

  return token
}

export const GMX_V2_COLLATERAL_TOKENS = tokens
  .filter((t) => !t.synthetic)
  .map((token) => {
    return {
      symbol: token.symbol,
      name: token.symbol,
      decimals: token.decimals,
      address: {
        [arbitrum.id]: token.address,
        [optimism.id]: undefined
      }
    } as Token
  })
