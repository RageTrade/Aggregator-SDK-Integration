import { Token } from '../../common/tokens'
import { arbitrum, optimism } from 'viem/chains'
import { ethers } from 'ethers'

const tokens = [
  {
    symbol: 'ETH',
    address: ethers.constants.AddressZero,
    decimals: 18,
    priceDecimals: 12
  },
  {
    symbol: 'WETH',
    address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    decimals: 18,
    priceDecimals: 12
  },
  {
    symbol: 'BTC',
    address: '0x47904963fc8b2340414262125aF798B9655E58Cd',
    decimals: 8,
    synthetic: true,
    priceDecimals: 22
  },
  {
    symbol: 'WBTC.b',
    address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    decimals: 8,
    priceDecimals: 22
  },
  {
    symbol: 'DOGE',
    address: '0xC4da4c24fd591125c3F47b340b6f4f76111883d8',
    decimals: 8,
    synthetic: true,
    priceDecimals: 22
  },
  {
    symbol: 'LTC',
    address: '0xB46A094Bc4B0adBD801E14b9DB95e05E28962764',
    decimals: 8,
    synthetic: true,
    priceDecimals: 22
  },
  {
    symbol: 'SOL',
    address: '0x2bcC6D6CdBbDC0a4071e48bb3B969b06B3330c07',
    decimals: 9,
    priceDecimals: 21
  },
  {
    symbol: 'UNI',
    address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
    decimals: 18,
    priceDecimals: 12
  },
  {
    symbol: 'LINK',
    address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
    decimals: 18,
    priceDecimals: 12
  },
  {
    symbol: 'ARB',
    address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    decimals: 18,
    priceDecimals: 12
  },
  {
    symbol: 'XRP',
    address: '0xc14e065b0067dE91534e032868f5Ac6ecf2c6868',
    decimals: 6,
    synthetic: true,
    priceDecimals: 24
  },
  {
    symbol: 'USDC',
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    decimals: 6,
    priceDecimals: 24
  },
  {
    symbol: 'USDC.e',
    address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    decimals: 6,
    priceDecimals: 24
  },
  {
    symbol: 'USDT',
    address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    decimals: 6,
    priceDecimals: 24
  },
  {
    symbol: 'DAI',
    address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    decimals: 18,
    priceDecimals: 12
  },
  {
    name: 'Wrapped BNB (LayerZero)',
    symbol: 'BNB',
    assetSymbol: 'WBNB (LayerZero)',
    address: '0xa9004A5421372E1D83fB1f85b0fc986c912f91f3',
    decimals: 18,
    imageUrl: 'https://assets.coingecko.com/coins/images/825/standard/bnb-icon2_2x.png?1696501970',
    coingeckoUrl: 'https://www.coingecko.com/en/coins/bnb',
    coingeckoSymbol: 'BNB',
    metamaskSymbol: 'WBNB',
    explorerUrl: 'https://arbiscan.io/token/0xa9004A5421372E1D83fB1f85b0fc986c912f91f3',
    priceDecimals: 12
  },
  {
    name: 'Cosmos',
    symbol: 'ATOM',
    assetSymbol: 'ATOM',
    address: '0x7D7F1765aCbaF847b9A1f7137FE8Ed4931FbfEbA',
    decimals: 6,
    imageUrl: 'https://assets.coingecko.com/coins/images/1481/standard/cosmos_hub.png?1696502525',
    coingeckoUrl: 'https://www.coingecko.com/en/coins/cosmos-hub',
    coingeckoSymbol: 'ATOM',
    isSynthetic: true,
    priceDecimals: 24
  },
  {
    name: 'Near',
    symbol: 'NEAR',
    assetSymbol: 'NEAR',
    address: '0x1FF7F3EFBb9481Cbd7db4F932cBCD4467144237C',
    decimals: 24,
    imageUrl: 'https://assets.coingecko.com/coins/images/10365/standard/near.jpg?1696510367',
    coingeckoUrl: 'https://www.coingecko.com/en/coins/near',
    coingeckoSymbol: 'NEAR',
    isSynthetic: true,
    priceDecimals: 6
  },
  {
    name: 'Aave',
    symbol: 'AAVE',
    assetSymbol: 'AAVE',
    address: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196',
    decimals: 18,
    imageUrl: 'https://assets.coingecko.com/coins/images/12645/standard/AAVE.png?1696512452',
    coingeckoUrl: 'https://www.coingecko.com/en/coins/aave',
    coingeckoSymbol: 'AAVE',
    priceDecimals: 12
  },
  {
    name: 'Wrapped AVAX (Wormhole)',
    symbol: 'AVAX',
    assetSymbol: 'WAVAX (Wormhole)',
    address: '0x565609fAF65B92F7be02468acF86f8979423e514',
    decimals: 18,
    imageUrl: 'https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818',
    coingeckoUrl: 'https://www.coingecko.com/en/coins/avalanche',
    coingeckoSymbol: 'AVAX',
    explorerSymbol: 'WAVAX',
    priceDecimals: 18
  }
]

export type GMX_V2_TOKEN = Token & { priceDecimals: number }

export const GMX_V2_TOKENS: { [key: string]: GMX_V2_TOKEN } = {}

tokens.forEach((token) => {
  GMX_V2_TOKENS[token.symbol] = {
    ...({
      symbol: token.symbol,
      name: token.symbol,
      decimals: token.decimals,
      address: {
        [arbitrum.id]: token.address,
        [optimism.id]: undefined
      }
    } as Token),
    priceDecimals: token.priceDecimals
  }
})

export const getGmxV2TokenBySymbol = (symbol: string): GMX_V2_TOKEN => {
  if (!GMX_V2_TOKENS[symbol]) throw new Error(`Token ${symbol} not found`)

  return GMX_V2_TOKENS[symbol]
}

export const getGmxV2TokenByAddress = (address: string): GMX_V2_TOKEN => {
  const token = Object.values(GMX_V2_TOKENS).find(
    (t) => t.address[arbitrum.id]?.toLowerCase() === address.toLowerCase()
  )
  if (!token) throw new Error(`Token ${address} not found`)

  return token
}

export const GMX_V2_COLLATERAL_TOKENS: GMX_V2_TOKEN[] = tokens
  .filter((t) => !t.synthetic)
  .map((token) => {
    return {
      ...({
        symbol: token.symbol,
        name: token.symbol,
        decimals: token.decimals,
        address: {
          [arbitrum.id]: token.address,
          [optimism.id]: undefined
        }
      } as Token),
      priceDecimals: token.priceDecimals
    }
  })
