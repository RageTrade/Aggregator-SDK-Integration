import { BigNumber, BigNumberish, ethers } from 'ethers'
import { getContract } from './contracts'
import { ARBITRUM, ARBITRUM_TESTNET, AVALANCHE, AVALANCHE_FUJI } from './chains'
import { parseEther } from 'ethers/lib/utils'
import { Provider } from '@ethersproject/providers'
import { IERC20__factory, Reader__factory, VaultReader__factory } from '../../../typechain/gmx-v1'
import { ExtendedMarket, ExtendedPosition, ViewError, Order } from '../../interface'
import { logObject, toNumberDecimal, getBNFromFN, toAmountInfo } from '../../common/helper'
import { CACHE_MINUTE, CACHE_SECOND, GMXV1_CACHE_PREFIX, cacheFetch, getStaleTime } from '../../common/cache'
import { CACHE_TIME_MULT } from '../../common/cache'
import { ApiOpts, CloseTradePreviewInfo, MarketInfo, PreviewInfo } from '../../interfaces/V1/IRouterAdapterBaseV1'
import {
  CreateOrder,
  PositionInfo,
  OpenTradePreviewInfo,
  ClosePositionData,
  AmountInfo
} from '../../../src/interfaces/V1/IRouterAdapterBaseV1'
import { rpc } from '../../../src/common/provider'
import { FixedNumber } from '../../../src/common/fixedNumber'
import { getTokenByAddress, getTokenBySymbol as getTokenBySymbolCommon } from '../../../src/common/tokens'
import { ZERO } from '../../../src/common/constants'

export type GToken = {
  name: string
  symbol: string
  baseSymbol?: string
  decimals: number
  address: string
  priceDecimals?: number
  wrappedAddress?: string
  coingeckoUrl?: string
  explorerUrl?: string
  reservesUrl?: string
  imageUrl?: string

  isUsdg?: boolean
  isNative?: boolean
  isWrapped?: boolean
  isShortable?: boolean
  isStable?: boolean
  isSynthetic?: boolean
  isTempHidden?: boolean
  isChartDisabled?: boolean
  isV1Available?: boolean
  isPlatformToken?: boolean
}

export type TokenInfo = GToken & {
  hasMaxAvailableLong?: boolean
  hasMaxAvailableShort?: boolean

  usdgAmount?: BigNumber
  maxUsdgAmount?: BigNumber

  poolAmount?: BigNumber
  bufferAmount?: BigNumber
  managedAmount?: BigNumber
  managedUsd?: BigNumber
  availableAmount?: BigNumber
  availableUsd?: BigNumber
  guaranteedUsd?: BigNumber
  redemptionAmount?: BigNumber
  reservedAmount?: BigNumber

  balance?: BigNumber

  weight?: BigNumber

  maxPrice?: BigNumber
  maxPrimaryPrice?: BigNumber

  minPrice?: BigNumber
  minPrimaryPrice?: BigNumber

  contractMaxPrice?: BigNumber
  contractMinPrice?: BigNumber

  spread?: BigNumber

  cumulativeFundingRate?: BigNumber
  fundingRate?: BigNumber

  globalShortSize?: BigNumber

  maxAvailableLong?: BigNumber
  maxAvailableShort?: BigNumber

  maxGlobalLongSize?: BigNumber
  maxGlobalShortSize?: BigNumber

  maxLongCapacity?: BigNumber
}

export type InfoTokens = {
  [key: string]: TokenInfo
}

export type TokenPrices = {
  minPrice: BigNumber
  maxPrice: BigNumber
}

export const TOKENS: { [chainId: number]: GToken[] } = {
  [ARBITRUM]: [
    {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      address: ethers.constants.AddressZero,
      isNative: true,
      isShortable: true,
      imageUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880',
      coingeckoUrl: 'https://www.coingecko.com/en/coins/ethereum',
      isV1Available: true
    },
    {
      name: 'Wrapped Ethereum',
      symbol: 'WETH',
      decimals: 18,
      address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      isWrapped: true,
      baseSymbol: 'ETH',
      imageUrl: 'https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1628852295',
      coingeckoUrl: 'https://www.coingecko.com/en/coins/ethereum',
      isV1Available: true
    },
    {
      name: 'Bitcoin (WBTC)',
      symbol: 'BTC',
      decimals: 8,
      address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
      isShortable: true,
      imageUrl: 'https://assets.coingecko.com/coins/images/26115/thumb/btcb.png?1655921693',
      coingeckoUrl: 'https://www.coingecko.com/en/coins/wrapped-bitcoin',
      explorerUrl: 'https://arbiscan.io/address/0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
      isV1Available: true
    },
    {
      name: 'Arbitrum',
      symbol: 'ARB',
      decimals: 18,
      priceDecimals: 3,
      address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      imageUrl: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg?1680097630',
      coingeckoUrl: 'https://www.coingecko.com/en/coins/arbitrum',
      explorerUrl: 'https://arbiscan.io/token/0x912ce59144191c1204e64559fe8253a0e49e6548'
    },
    {
      name: 'Wrapped SOL (Wormhole)',
      symbol: 'SOL',
      decimals: 9,
      address: '0x2bcC6D6CdBbDC0a4071e48bb3B969b06B3330c07',
      imageUrl: 'https://assets.coingecko.com/coins/images/4128/small/solana.png?1640133422',
      coingeckoUrl: 'https://www.coingecko.com/en/coins/solana',
      explorerUrl: 'https://arbiscan.io/token/0x2bCc6D6CdBbDC0a4071e48bb3B969b06B3330c07'
    },
    {
      name: 'Chainlink',
      symbol: 'LINK',
      decimals: 18,
      priceDecimals: 3,
      address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
      isStable: false,
      isShortable: true,
      imageUrl: 'https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png?1547034700',
      coingeckoUrl: 'https://www.coingecko.com/en/coins/chainlink',
      explorerUrl: 'https://arbiscan.io/token/0xf97f4df75117a78c1a5a0dbb814af92458539fb4',
      isV1Available: true
    },
    {
      name: 'Uniswap',
      symbol: 'UNI',
      decimals: 18,
      priceDecimals: 3,
      address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
      isStable: false,
      isShortable: true,
      imageUrl: 'https://assets.coingecko.com/coins/images/12504/thumb/uniswap-uni.png?1600306604',
      coingeckoUrl: 'https://www.coingecko.com/en/coins/uniswap',
      explorerUrl: 'https://arbiscan.io/token/0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0',
      isV1Available: true
    },
    {
      name: 'Bridged USDC (USDC.e)',
      symbol: 'USDC.e',
      decimals: 6,
      address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      isStable: true,
      imageUrl: 'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389',
      coingeckoUrl: 'https://www.coingecko.com/en/coins/usd-coin',
      explorerUrl: 'https://arbiscan.io/token/0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      isV1Available: true
    },
    {
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      isStable: true,
      isV1Available: true,
      imageUrl: 'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389',
      coingeckoUrl: 'https://www.coingecko.com/en/coins/usd-coin',
      explorerUrl: 'https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    {
      name: 'Tether',
      symbol: 'USDT',
      decimals: 6,
      address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      isStable: true,
      imageUrl: 'https://assets.coingecko.com/coins/images/325/thumb/Tether-logo.png?1598003707',
      explorerUrl: 'https://arbiscan.io/address/0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      coingeckoUrl: 'https://www.coingecko.com/en/coins/tether',
      isV1Available: true
    },
    {
      name: 'Dai',
      symbol: 'DAI',
      decimals: 18,
      address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      isStable: true,
      imageUrl: 'https://assets.coingecko.com/coins/images/9956/thumb/4943.png?1636636734',
      coingeckoUrl: 'https://www.coingecko.com/en/coins/dai',
      explorerUrl: 'https://arbiscan.io/token/0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      isV1Available: true
    },
    {
      name: 'Frax',
      symbol: 'FRAX',
      decimals: 18,
      address: '0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F',
      isStable: true,
      imageUrl: 'https://assets.coingecko.com/coins/images/13422/small/frax_logo.png?1608476506',
      coingeckoUrl: 'https://www.coingecko.com/en/coins/frax',
      explorerUrl: 'https://arbiscan.io/token/0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F',
      isV1Available: true
    },
    {
      name: 'Magic Internet Money',
      symbol: 'MIM',
      decimals: 18,
      address: '0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A',
      isStable: true,
      isTempHidden: true,
      imageUrl: 'https://assets.coingecko.com/coins/images/16786/small/mimlogopng.png',
      isV1Available: true
    },
    {
      name: 'Bitcoin',
      symbol: 'BTC',
      address: '0x47904963fc8b2340414262125aF798B9655E58Cd',
      isSynthetic: true,
      decimals: 8,
      imageUrl: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png?1547033579',
      //TODO: remove explorerUrl in future
      explorerUrl: 'https://arbiscan.io/address/0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
      coingeckoUrl: 'https://www.coingecko.com/en/coins/bitcoin'
    },
    {
      name: 'Dogecoin',
      symbol: 'DOGE',
      decimals: 8,
      priceDecimals: 4,
      address: '0xC4da4c24fd591125c3F47b340b6f4f76111883d8',
      isSynthetic: true,
      imageUrl: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png?1547792256',
      coingeckoUrl: 'https://www.coingecko.com/en/coins/dogecoin'
    },
    {
      name: 'Litecoin',
      symbol: 'LTC',
      decimals: 8,
      address: '0xB46A094Bc4B0adBD801E14b9DB95e05E28962764',
      isSynthetic: true,
      imageUrl: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png?1547033580',
      coingeckoUrl: 'https://www.coingecko.com/en/coins/litecoin'
    },
    {
      name: 'XRP',
      symbol: 'XRP',
      decimals: 6,
      priceDecimals: 4,
      address: '0xc14e065b0067dE91534e032868f5Ac6ecf2c6868',
      imageUrl: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png?1605778731',
      coingeckoUrl: 'https://www.coingecko.com/en/coins/xrp',
      isSynthetic: true
    }
  ]
}

export const ICONLINKS = {
  [ARBITRUM_TESTNET]: {
    GMX: {
      coingecko: 'https://www.coingecko.com/en/coins/gmx',
      arbitrum: 'https://arbiscan.io/address/0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a'
    },
    GLP: {
      arbitrum: 'https://testnet.arbiscan.io/token/0xb4f81Fa74e06b5f762A104e47276BA9b2929cb27'
    }
  },
  [ARBITRUM]: {
    GMX: {
      coingecko: 'https://www.coingecko.com/en/coins/gmx',
      arbitrum: 'https://arbiscan.io/address/0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a'
    },
    GLP: {
      arbitrum: 'https://arbiscan.io/token/0x1aDDD80E6039594eE970E5872D247bf0414C8903',
      reserves: 'https://portfolio.nansen.ai/dashboard/gmx?chain=ARBITRUM'
    },
    ETH: {
      coingecko: 'https://www.coingecko.com/en/coins/ethereum'
    },
    BTC: {
      coingecko: 'https://www.coingecko.com/en/coins/wrapped-bitcoin',
      arbitrum: 'https://arbiscan.io/address/0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f'
    },
    LINK: {
      coingecko: 'https://www.coingecko.com/en/coins/chainlink',
      arbitrum: 'https://arbiscan.io/address/0xf97f4df75117a78c1a5a0dbb814af92458539fb4'
    },
    UNI: {
      coingecko: 'https://www.coingecko.com/en/coins/uniswap',
      arbitrum: 'https://arbiscan.io/address/0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0'
    },
    USDC: {
      coingecko: 'https://www.coingecko.com/en/coins/usd-coin',
      arbitrum: 'https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    'USDC.e': {
      coingecko: 'https://www.coingecko.com/en/coins/usd-coin',
      arbitrum: 'https://arbiscan.io/address/0xff970a61a04b1ca14834a43f5de4533ebddb5cc8'
    },
    USDT: {
      coingecko: 'https://www.coingecko.com/en/coins/tether',
      arbitrum: 'https://arbiscan.io/address/0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9'
    },
    DAI: {
      coingecko: 'https://www.coingecko.com/en/coins/dai',
      arbitrum: 'https://arbiscan.io/address/0xda10009cbd5d07dd0cecc66161fc93d7c9000da1'
    },
    MIM: {
      coingecko: 'https://www.coingecko.com/en/coins/magic-internet-money',
      arbitrum: 'https://arbiscan.io/address/0xfea7a6a0b346362bf88a9e4a88416b77a57d6c2a'
    },
    FRAX: {
      coingecko: 'https://www.coingecko.com/en/coins/frax',
      arbitrum: 'https://arbiscan.io/address/0x17fc002b466eec40dae837fc4be5c67993ddbd6f'
    }
  },
  [AVALANCHE]: {
    GMX: {
      coingecko: 'https://www.coingecko.com/en/coins/gmx',
      avalanche: 'https://snowtrace.io/address/0x62edc0692bd897d2295872a9ffcac5425011c661'
    },
    GLP: {
      avalanche: 'https://snowtrace.io/address/0x9e295B5B976a184B14aD8cd72413aD846C299660',
      reserves: 'https://portfolio.nansen.ai/dashboard/gmx?chain=AVAX'
    },
    AVAX: {
      coingecko: 'https://www.coingecko.com/en/coins/avalanche'
    },
    ETH: {
      coingecko: 'https://www.coingecko.com/en/coins/weth',
      avalanche: 'https://snowtrace.io/address/0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab'
    },
    WBTC: {
      coingecko: 'https://www.coingecko.com/en/coins/wrapped-bitcoin',
      avalanche: 'https://snowtrace.io/address/0x50b7545627a5162f82a992c33b87adc75187b218'
    },
    BTC: {
      coingecko: 'https://www.coingecko.com/en/coins/bitcoin-avalanche-bridged-btc-b',
      avalanche: 'https://snowtrace.io/address/0x152b9d0FdC40C096757F570A51E494bd4b943E50'
    },
    MIM: {
      coingecko: 'https://www.coingecko.com/en/coins/magic-internet-money',
      avalanche: 'https://snowtrace.io/address/0x130966628846bfd36ff31a822705796e8cb8c18d'
    },
    USDC: {
      coingecko: 'https://www.coingecko.com/en/coins/usd-coin',
      avalanche: 'https://snowtrace.io/address/0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e'
    },
    'USDC.e': {
      coingecko: 'https://www.coingecko.com/en/coins/usd-coin-avalanche-bridged-usdc-e',
      avalanche: 'https://snowtrace.io/address/0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664'
    }
  },
  [AVALANCHE_FUJI]: {
    AVAX: {
      coingecko: 'https://www.coingecko.com/en/coins/avalanche'
    },
    ETH: {
      coingecko: 'https://www.coingecko.com/en/coins/weth',
      avalanche: 'https://testnet.snowtrace.io/address/0x8226EC2c1926c9162b6F815153d10018A7ccdf07'
    },
    USDC: {
      coingecko: 'https://www.coingecko.com/en/coins/usd-coin',
      avalanche: 'https://testnet.snowtrace.io/address/0xC492c8d82DC576Ad870707bb40EDb63E2026111E'
    }
  }
}

const constants: { [chainId: number]: any } = {
  [ARBITRUM]: {
    nativeTokenSymbol: 'ETH',
    wrappedTokenSymbol: 'WETH',
    defaultCollateralSymbol: 'USDC.e',
    defaultFlagOrdersEnabled: false,
    positionReaderPropsLength: 9,
    v2: true,

    SWAP_ORDER_EXECUTION_GAS_FEE: parseEther('0.0003'),
    INCREASE_ORDER_EXECUTION_GAS_FEE: parseEther('0.0003'),
    // contract requires that execution fee be strictly greater than instead of gte
    DECREASE_ORDER_EXECUTION_GAS_FEE: parseEther('0.000300001')
  },
  [AVALANCHE]: {
    nativeTokenSymbol: 'AVAX',
    wrappedTokenSymbol: 'WAVAX',
    defaultCollateralSymbol: 'USDC',
    defaultFlagOrdersEnabled: true,
    positionReaderPropsLength: 9,
    v2: true,

    SWAP_ORDER_EXECUTION_GAS_FEE: parseEther('0.01'),
    INCREASE_ORDER_EXECUTION_GAS_FEE: parseEther('0.01'),
    // contract requires that execution fee be strictly greater than instead of gte
    DECREASE_ORDER_EXECUTION_GAS_FEE: parseEther('0.0100001')
  }
}

export const GLP_POOL_COLORS = {
  ETH: '#6062a6',
  BTC: '#F7931A',
  WBTC: '#F7931A',
  USDC: '#2775CA',
  'USDC.e': '#2A5ADA',
  USDT: '#67B18A',
  MIM: '#9695F8',
  FRAX: '#000',
  DAI: '#FAC044',
  UNI: '#E9167C',
  AVAX: '#E84142',
  LINK: '#3256D6'
}

export const TOKENS_MAP: { [chainId: number]: { [address: string]: GToken } } = {}
export const V1_TOKENS: { [chainId: number]: GToken[] } = {}
export const V2_TOKENS: { [chainId: number]: GToken[] } = {}
export const TOKENS_BY_SYMBOL_MAP: {
  [chainId: number]: { [symbol: string]: GToken }
} = {}
export const WRAPPED_TOKENS_MAP: { [chainId: number]: GToken } = {}
export const NATIVE_TOKENS_MAP: { [chainId: number]: GToken } = {}

const CHAIN_IDS = [ARBITRUM]

for (let j = 0; j < CHAIN_IDS.length; j++) {
  const chainId = CHAIN_IDS[j]

  TOKENS_MAP[chainId] = {}
  TOKENS_BY_SYMBOL_MAP[chainId] = {}
  V1_TOKENS[chainId] = []
  V2_TOKENS[chainId] = []

  let tokens = TOKENS[chainId]
  let wrappedTokenAddress: string | undefined

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    TOKENS_MAP[chainId][token.address] = token
    TOKENS_MAP[chainId][token.address.toLowerCase()] = token
    TOKENS_BY_SYMBOL_MAP[chainId][token.symbol] = token

    if (token.isWrapped) {
      WRAPPED_TOKENS_MAP[chainId] = token
      wrappedTokenAddress = token.address
    }

    if (token.isNative) {
      NATIVE_TOKENS_MAP[chainId] = token
    }

    if (token.isV1Available && !token.isTempHidden) {
      V1_TOKENS[chainId].push(token)
    }

    if (!token.isPlatformToken && !token.isTempHidden) {
      V2_TOKENS[chainId].push(token)
    }
  }

  NATIVE_TOKENS_MAP[chainId].wrappedAddress = wrappedTokenAddress
}

export function getWrappedToken(chainId: number) {
  return WRAPPED_TOKENS_MAP[chainId]
}

export function getNativeToken(chainId: number) {
  return NATIVE_TOKENS_MAP[chainId]
}

export function getTokens(chainId: number) {
  return TOKENS[chainId]
}

const getTokenAddress = (token: { address: string }, nativeTokenAddress: { address: string }) => {
  if (token.address === ethers.constants.AddressZero) {
    return nativeTokenAddress.address as string
  }
  return token.address as string
}

export function isValidToken(chainId: number, address: string) {
  if (!TOKENS_MAP[chainId]) {
    throw new Error(`Incorrect chainId ${chainId}`)
  }
  return address in TOKENS_MAP[chainId]
}

export function getToken(chainId: number, address: string) {
  address = address.toLowerCase()
  if (!TOKENS_MAP[chainId]) {
    throw new Error(`Incorrect chainId ${chainId}`)
  }
  if (!TOKENS_MAP[chainId][address]) {
    throw new Error(`Incorrect address "${address}" for chainId ${chainId}`)
  }
  return TOKENS_MAP[chainId][address]
}

export function getTokenBySymbol(chainId: number, symbol: string) {
  const token = TOKENS_BY_SYMBOL_MAP[chainId][symbol]
  if (!token) {
    throw new Error(`Incorrect symbol "${symbol}" for chainId ${chainId}`)
  }
  return token
}

export function getWhitelistedTokens(chainId: number) {
  return V1_TOKENS[chainId].filter((token) => token.symbol !== 'USDG')
}

export function getVisibleTokens(chainId: number) {
  return getWhitelistedTokens(chainId).filter((token) => !token.isWrapped && !token.isTempHidden)
}

export function getNormalizedTokenSymbol(tokenSymbol: string) {
  if (['WBTC', 'WETH', 'WAVAX'].includes(tokenSymbol)) {
    return tokenSymbol.substr(1)
  } else if (tokenSymbol === 'BTC.b') {
    return 'BTC'
  }
  return tokenSymbol
}

export function getPositionQuery(
  tokens: { address: string; isStable: boolean; isWrapped: boolean }[],
  nativeTokenAddress: string
) {
  const collateralTokens: string[] = []
  const indexTokens: string[] = []
  const isLong: boolean[] = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.isStable) {
      continue
    }
    if (token.isWrapped) {
      continue
    }
    collateralTokens.push(getTokenAddress(token, { address: nativeTokenAddress }))
    indexTokens.push(getTokenAddress(token, { address: nativeTokenAddress }))
    isLong.push(true)
  }

  for (let i = 0; i < tokens.length; i++) {
    const stableToken = tokens[i]
    if (!stableToken.isStable) {
      continue
    }

    for (let j = 0; j < tokens.length; j++) {
      const token = tokens[j]
      if (token.isStable) {
        continue
      }
      if (token.isWrapped) {
        continue
      }
      collateralTokens.push(stableToken.address)
      indexTokens.push(getTokenAddress(token, { address: nativeTokenAddress }))
      isLong.push(false)
    }
  }

  return { collateralTokens, indexTokens, isLong }
}

export function bigNumberify(n?: BigNumberish) {
  try {
    return BigNumber.from(n)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('bigNumberify error', e)
    return undefined
  }
}

export function expandDecimals(n: BigNumberish, decimals: number): BigNumber {
  // @ts-ignore
  return bigNumberify(n).mul(bigNumberify(10).pow(decimals))
}

export function getSpread(p: { minPrice: BigNumber; maxPrice: BigNumber }): BigNumber {
  const diff = p.maxPrice.sub(p.minPrice)
  return diff.mul(PRECISION).div(p.maxPrice.add(p.minPrice).div(2))
}

export const getConstant = (chainId: number, key: string) => {
  if (!constants[chainId]) {
    throw new Error(`Unsupported chainId ${chainId}`)
  }

  if (!(key in constants[chainId])) {
    throw new Error(`Key ${key} does not exist for chainId ${chainId}`)
  }

  return constants[chainId][key]
}

export function getTokenInfo(
  infoTokens: InfoTokens,
  tokenAddress: string,
  replaceNative?: boolean,
  nativeTokenAddress?: string
) {
  if (replaceNative && tokenAddress === nativeTokenAddress) {
    return infoTokens[ethers.constants.AddressZero]
  }

  return infoTokens[tokenAddress]
}

export function getPositionKey(
  account: string,
  collateralTokenAddress: string,
  indexTokenAddress: string,
  isLong: boolean,
  nativeTokenAddress?: string
) {
  const tokenAddress0 =
    collateralTokenAddress === ethers.constants.AddressZero ? nativeTokenAddress : collateralTokenAddress
  const tokenAddress1 = indexTokenAddress === ethers.constants.AddressZero ? nativeTokenAddress : indexTokenAddress
  return account + ':' + tokenAddress0 + ':' + tokenAddress1 + ':' + isLong
}

export function getPositionContractKey(account: string, collateralToken: string, indexToken: string, isLong: Boolean) {
  return ethers.utils.solidityKeccak256(
    ['address', 'address', 'address', 'bool'],
    [account, collateralToken, indexToken, isLong]
  )
}

export function getFundingFee(data: {
  size: BigNumber
  entryFundingRate?: BigNumber
  cumulativeFundingRate?: BigNumber
}) {
  let { entryFundingRate, cumulativeFundingRate, size } = data

  if (entryFundingRate && cumulativeFundingRate) {
    return size.mul(cumulativeFundingRate.sub(entryFundingRate)).div(FUNDING_RATE_PRECISION)
  }

  return
}

export const limitDecimals = (amount: BigNumberish, maxDecimals?: number) => {
  let amountStr = amount.toString()
  if (maxDecimals === undefined) {
    return amountStr
  }
  if (maxDecimals === 0) {
    return amountStr.split('.')[0]
  }
  const dotIndex = amountStr.indexOf('.')
  if (dotIndex !== -1) {
    let decimals = amountStr.length - dotIndex - 1
    if (decimals > maxDecimals) {
      amountStr = amountStr.substr(0, amountStr.length - (decimals - maxDecimals))
    }
  }

  return amountStr
}

export const padDecimals = (amount: BigNumberish, minDecimals: number) => {
  let amountStr = amount.toString()
  const dotIndex = amountStr.indexOf('.')
  if (dotIndex !== -1) {
    const decimals = amountStr.length - dotIndex - 1
    if (decimals < minDecimals) {
      amountStr = amountStr.padEnd(amountStr.length + (minDecimals - decimals), '0')
    }
  } else {
    amountStr = amountStr + '.0000'
  }
  return amountStr
}

export function numberWithCommas(x: BigNumberish) {
  if (!x) {
    return '...'
  }

  var parts = x.toString().split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

export const formatAmount = (
  amount: BigNumberish | undefined,
  tokenDecimals: number,
  displayDecimals?: number,
  useCommas?: boolean,
  defaultValue?: string
) => {
  if (!defaultValue) {
    defaultValue = '...'
  }
  if (amount === undefined || amount.toString().length === 0) {
    return defaultValue
  }
  if (displayDecimals === undefined) {
    displayDecimals = 4
  }
  let amountStr = ethers.utils.formatUnits(amount, tokenDecimals)
  amountStr = limitDecimals(amountStr, displayDecimals)
  if (displayDecimals !== 0) {
    amountStr = padDecimals(amountStr, displayDecimals)
  }
  if (useCommas) {
    return numberWithCommas(amountStr)
  }
  return amountStr
}

export function getDeltaStr({ delta, deltaPercentage, hasProfit }: any) {
  let deltaStr
  let deltaPercentageStr

  if (delta.gt(0)) {
    deltaStr = hasProfit ? '+' : '-'
    deltaPercentageStr = hasProfit ? '+' : '-'
  } else {
    deltaStr = ''
    deltaPercentageStr = ''
  }
  deltaStr += `$${formatAmount(delta, USD_DECIMALS, 2, true)}`
  deltaPercentageStr += `${formatAmount(deltaPercentage, 2, 2)}%`

  return { deltaStr, deltaPercentageStr }
}

type GetLeverageParams = {
  size: BigNumber
  collateral: BigNumber
  fundingFee?: BigNumber
  hasProfit?: boolean
  delta?: BigNumber
  includeDelta?: boolean
}

export function getLeverage({ size, collateral, fundingFee, hasProfit, delta, includeDelta }: GetLeverageParams) {
  if (!size || !collateral) {
    return
  }

  let remainingCollateral = collateral

  if (fundingFee && fundingFee.gt(0)) {
    remainingCollateral = remainingCollateral.sub(fundingFee)
  }

  if (delta && includeDelta) {
    if (hasProfit) {
      remainingCollateral = remainingCollateral.add(delta)
    } else {
      if (delta.gt(remainingCollateral)) {
        return
      }

      remainingCollateral = remainingCollateral.sub(delta)
    }
  }

  if (remainingCollateral.eq(0)) {
    return
  }
  return size.mul(BASIS_POINTS_DIVISOR).div(remainingCollateral)
}

export function getLeverageStr(leverage: BigNumber) {
  if (leverage && BigNumber.isBigNumber(leverage)) {
    if (leverage.lt(0)) {
      return '> 100x'
    }
    return `${formatAmount(leverage, 4, 2, true)}x`
  }
}

function applyPendingChanges(position: any, pendingPositions: any) {
  if (!pendingPositions) {
    return
  }
  const { key } = position

  if (
    pendingPositions[key] &&
    pendingPositions[key].updatedAt &&
    pendingPositions[key].pendingChanges &&
    pendingPositions[key].updatedAt + PENDING_POSITION_VALID_DURATION > Date.now()
  ) {
    const { pendingChanges } = pendingPositions[key]
    if (pendingChanges.size && position.size.eq(pendingChanges.size)) {
      return
    }

    if (pendingChanges.expectingCollateralChange && !position.collateral.eq(pendingChanges.collateralSnapshot)) {
      return
    }

    position.hasPendingChanges = true
    position.pendingChanges = pendingChanges
  }
}

export const GMX_STATS_API_URL = 'https://stats.gmx.io/api'

const BACKEND_URLS: any = {
  default: 'https://gmx-server-mainnet.uw.r.appspot.com',

  [ARBITRUM]: 'https://gmx-server-mainnet.uw.r.appspot.com'
}

export function getServerBaseUrl(chainId: number) {
  if (!chainId) {
    throw new Error('chainId is not provided')
  }

  return BACKEND_URLS[chainId] || BACKEND_URLS.default
}

export function getServerUrl(chainId: number, path: string) {
  return `${getServerBaseUrl(chainId)}${path}`
}

type GetLiquidationParams = {
  size: BigNumber
  collateral: BigNumber
  averagePrice: BigNumber
  isLong: boolean
  fundingFee?: BigNumber
}

export function getLiquidationPriceFromDelta({
  liquidationAmount,
  size,
  collateral,
  averagePrice,
  isLong
}: {
  liquidationAmount: BigNumber
  size: BigNumber
  collateral: BigNumber
  averagePrice: BigNumber
  isLong: boolean
}) {
  if (!size || size.eq(0)) {
    return
  }

  if (liquidationAmount.gt(collateral)) {
    const liquidationDelta = liquidationAmount.sub(collateral)
    const priceDelta = liquidationDelta.mul(averagePrice).div(size)

    return isLong ? averagePrice.add(priceDelta) : averagePrice.sub(priceDelta)
  }

  const liquidationDelta = collateral.sub(liquidationAmount)
  const priceDelta = liquidationDelta.mul(averagePrice).div(size)

  return isLong ? averagePrice.sub(priceDelta) : averagePrice.add(priceDelta)
}

function calculateTotalFees(size: BigNumber, fundingFees: BigNumber): BigNumber {
  return size.mul(MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR).add(fundingFees).add(LIQUIDATION_FEE)
}

export function getLiquidationPrice({ size, collateral, averagePrice, isLong, fundingFee }: GetLiquidationParams) {
  if (!size || !collateral || !averagePrice) {
    return
  }

  const totalFees = calculateTotalFees(size, fundingFee || BigNumber.from('0'))
  const liquidationPriceForFees = getLiquidationPriceFromDelta({
    liquidationAmount: totalFees,
    size,
    collateral,
    averagePrice,
    isLong
  })

  const liquidationPriceForMaxLeverage = getLiquidationPriceFromDelta({
    liquidationAmount: size.mul(BASIS_POINTS_DIVISOR).div(MAX_LEVERAGE),
    size: size,
    collateral,
    averagePrice,
    isLong
  })

  if (!liquidationPriceForFees) {
    return liquidationPriceForMaxLeverage
  }

  if (!liquidationPriceForMaxLeverage) {
    return liquidationPriceForFees
  }

  if (isLong) {
    // return the higher price
    return liquidationPriceForFees.gt(liquidationPriceForMaxLeverage)
      ? liquidationPriceForFees
      : liquidationPriceForMaxLeverage
  }

  // return the lower price
  return liquidationPriceForFees.lt(liquidationPriceForMaxLeverage)
    ? liquidationPriceForFees
    : liquidationPriceForMaxLeverage
}

export const MIN_PROFIT_TIME = 0

export const USDG_ADDRESS = getContract(ARBITRUM, 'USDG')!
export const USDC_E_ADDRESS = getTokenBySymbol(ARBITRUM, 'USDC.e').address

export const MAX_PRICE_DEVIATION_BASIS_POINTS = 750
export const DEFAULT_GAS_LIMIT = 1 * 1000 * 1000
export const SECONDS_PER_YEAR = 31536000
export const USDG_DECIMALS = 18
export const USD_DECIMALS = 30
export const DEPOSIT_FEE = 30
export const DUST_BNB = '2000000000000000'
export const DUST_USD = expandDecimals(1, USD_DECIMALS)
export const PRECISION = expandDecimals(1, 30)
export const GLP_DECIMALS = 18
export const GMX_DECIMALS = 18
export const DEFAULT_MAX_USDG_AMOUNT = expandDecimals(200 * 1000 * 1000, 18)

export const TAX_BASIS_POINTS = 60
export const STABLE_TAX_BASIS_POINTS = 5
export const MINT_BURN_FEE_BASIS_POINTS = 25
export const SWAP_FEE_BASIS_POINTS = 25
export const STABLE_SWAP_FEE_BASIS_POINTS = 1
export const MARGIN_FEE_BASIS_POINTS = 10

export const LIQUIDATION_FEE = expandDecimals(5, USD_DECIMALS)

export const TRADES_PAGE_SIZE = 100

export const GLP_COOLDOWN_DURATION = 0
export const THRESHOLD_REDEMPTION_VALUE = expandDecimals(993, 27) // 0.993
export const FUNDING_RATE_PRECISION = 1000000

export const SWAP = 'Swap'
export const INCREASE = 'Increase'
export const DECREASE = 'Decrease'
export const LONG = 'Long'
export const SHORT = 'Short'

export const MARKET = 'Market'
export const LIMIT = 'Limit'
export const STOP = 'Stop'
export const LEVERAGE_ORDER_OPTIONS = [MARKET, LIMIT, STOP]
export const SWAP_ORDER_OPTIONS = [MARKET, LIMIT]
export const SWAP_OPTIONS = [LONG, SHORT, SWAP]
export const REFERRAL_CODE_QUERY_PARAM = 'ref'
export const MAX_REFERRAL_CODE_LENGTH = 20

export const MIN_PROFIT_BIPS = 0

export const MIN_ORDER_USD = expandDecimals(10, USD_DECIMALS)

export const BASIS_POINTS_DIVISOR = 10000

const PENDING_POSITION_VALID_DURATION = 600 * 1000
const UPDATED_POSITION_VALID_DURATION = 60 * 1000

export const MAX_LEVERAGE = 100 * BASIS_POINTS_DIVISOR

function setTokenUsingIndexPrices(
  token: TokenInfo,
  indexPrices: { [address: string]: BigNumber },
  nativeTokenAddress: string
) {
  if (!indexPrices) {
    return
  }

  const tokenAddress = token.isNative ? nativeTokenAddress : token.address

  const indexPrice = indexPrices[tokenAddress]

  if (!indexPrice) {
    return
  }

  const indexPriceBn = bigNumberify(indexPrice)!

  if (indexPriceBn.eq(0)) {
    return
  }

  const spread = token.maxPrice!.sub(token.minPrice!)
  const spreadBps = spread.mul(BASIS_POINTS_DIVISOR).div(token.maxPrice!.add(token.minPrice!).div(2))

  if (spreadBps.gt(MAX_PRICE_DEVIATION_BASIS_POINTS - 50)) {
    // only set one of the values as there will be a spread between the index price and the Chainlink price
    if (indexPriceBn.gt(token.minPrimaryPrice!)) {
      token.maxPrice = indexPriceBn
    } else {
      token.minPrice = indexPriceBn
    }
    return
  }

  const halfSpreadBps = spreadBps.div(2).toNumber()
  token.maxPrice = indexPriceBn.mul(BASIS_POINTS_DIVISOR + halfSpreadBps).div(BASIS_POINTS_DIVISOR)
  token.minPrice = indexPriceBn.mul(BASIS_POINTS_DIVISOR - halfSpreadBps).div(BASIS_POINTS_DIVISOR)
}

export function getInfoTokens(
  tokens: GToken[],
  tokenBalances: BigNumber[] | undefined,
  whitelistedTokens: GToken[],
  vaultTokenInfo: BigNumber[] | undefined,
  fundingRateInfo: BigNumber[] | undefined,
  vaultPropsLength: number | undefined,
  indexPrices: { [address: string]: BigNumber },
  nativeTokenAddress: string
): InfoTokens {
  if (!vaultPropsLength) {
    vaultPropsLength = 15
  }
  const fundingRatePropsLength = 2
  const infoTokens: InfoTokens = {}

  for (let i = 0; i < tokens.length; i++) {
    const token = JSON.parse(JSON.stringify(tokens[i])) as TokenInfo

    if (tokenBalances) {
      token.balance = tokenBalances[i]
    }

    if (token.address === USDG_ADDRESS) {
      token.minPrice = expandDecimals(1, USD_DECIMALS)
      token.maxPrice = expandDecimals(1, USD_DECIMALS)
    }

    infoTokens[token.address] = token
  }

  for (let i = 0; i < whitelistedTokens.length; i++) {
    const token = JSON.parse(JSON.stringify(whitelistedTokens[i])) as TokenInfo

    if (vaultTokenInfo) {
      token.poolAmount = vaultTokenInfo[i * vaultPropsLength]
      token.reservedAmount = vaultTokenInfo[i * vaultPropsLength + 1]
      token.availableAmount = token.poolAmount.sub(token.reservedAmount)
      token.usdgAmount = vaultTokenInfo[i * vaultPropsLength + 2]
      token.redemptionAmount = vaultTokenInfo[i * vaultPropsLength + 3]
      token.weight = vaultTokenInfo[i * vaultPropsLength + 4]
      token.bufferAmount = vaultTokenInfo[i * vaultPropsLength + 5]
      token.maxUsdgAmount = vaultTokenInfo[i * vaultPropsLength + 6]
      token.globalShortSize = vaultTokenInfo[i * vaultPropsLength + 7]
      token.maxGlobalShortSize = vaultTokenInfo[i * vaultPropsLength + 8]
      token.maxGlobalLongSize = vaultTokenInfo[i * vaultPropsLength + 9]
      token.minPrice = vaultTokenInfo[i * vaultPropsLength + 10]
      token.maxPrice = vaultTokenInfo[i * vaultPropsLength + 11]
      token.spread = getSpread({
        minPrice: token.minPrice,
        maxPrice: token.maxPrice
      })
      token.guaranteedUsd = vaultTokenInfo[i * vaultPropsLength + 12]
      token.maxPrimaryPrice = vaultTokenInfo[i * vaultPropsLength + 13]
      token.minPrimaryPrice = vaultTokenInfo[i * vaultPropsLength + 14]

      // save minPrice and maxPrice as setTokenUsingIndexPrices may override it
      token.contractMinPrice = token.minPrice
      token.contractMaxPrice = token.maxPrice

      token.maxAvailableShort = bigNumberify(0)!

      token.hasMaxAvailableShort = false
      if (token.maxGlobalShortSize.gt(0)) {
        token.hasMaxAvailableShort = true
        if (token.maxGlobalShortSize.gt(token.globalShortSize)) {
          token.maxAvailableShort = token.maxGlobalShortSize.sub(token.globalShortSize)
        }
      }

      if (token.maxUsdgAmount.eq(0)) {
        token.maxUsdgAmount = DEFAULT_MAX_USDG_AMOUNT
      }

      token.availableUsd = token.isStable
        ? token.poolAmount.mul(token.minPrice).div(expandDecimals(1, token.decimals))
        : token.availableAmount.mul(token.minPrice).div(expandDecimals(1, token.decimals))

      token.maxAvailableLong = bigNumberify(0)!
      token.hasMaxAvailableLong = false
      if (token.maxGlobalLongSize.gt(0)) {
        token.hasMaxAvailableLong = true

        if (token.maxGlobalLongSize.gt(token.guaranteedUsd)) {
          const remainingLongSize = token.maxGlobalLongSize.sub(token.guaranteedUsd)
          token.maxAvailableLong = remainingLongSize.lt(token.availableUsd) ? remainingLongSize : token.availableUsd
        }
      } else {
        token.maxAvailableLong = token.availableUsd
      }

      token.maxLongCapacity =
        token.maxGlobalLongSize.gt(0) && token.maxGlobalLongSize.lt(token.availableUsd.add(token.guaranteedUsd))
          ? token.maxGlobalLongSize
          : token.availableUsd.add(token.guaranteedUsd)

      token.managedUsd = token.availableUsd.add(token.guaranteedUsd)
      token.managedAmount = token.managedUsd.mul(expandDecimals(1, token.decimals)).div(token.minPrice)

      setTokenUsingIndexPrices(token, indexPrices, nativeTokenAddress)
    }

    if (fundingRateInfo) {
      token.fundingRate = fundingRateInfo[i * fundingRatePropsLength]
      token.cumulativeFundingRate = fundingRateInfo[i * fundingRatePropsLength + 1]
    }

    if (infoTokens[token.address]) {
      token.balance = infoTokens[token.address].balance
    }

    infoTokens[token.address] = token
  }

  return infoTokens
}

export async function useInfoTokens(
  library: Provider | undefined,
  chainId: number,
  active: boolean,
  tokenBalances?: BigNumber[],
  fundingRateInfo?: BigNumber[],
  vaultPropsLength?: number,
  opts?: ApiOpts
) {
  const tokens = V1_TOKENS[chainId]
  const vaultReaderAddress = getContract(chainId, 'VaultReader')
  const vaultAddress = getContract(chainId, 'Vault')
  const positionRouterAddress = getContract(chainId, 'PositionRouter')
  const nativeTokenAddress = getContract(chainId, 'NATIVE_TOKEN')

  const whitelistedTokens = tokens
  const whitelistedTokenAddresses = whitelistedTokens.map((token) => token.address)

  const vr = VaultReader__factory.connect(vaultReaderAddress!, library!)

  const sTimeVTI = getStaleTime(CACHE_SECOND * 5, opts)
  const vaultTokenInfoPromise = cacheFetch({
    key: [
      GMXV1_CACHE_PREFIX,
      'getVaultTokenInfoV4',
      vaultAddress!,
      positionRouterAddress!,
      nativeTokenAddress!,
      whitelistedTokenAddresses.join('-')
    ],
    fn: () =>
      vr.getVaultTokenInfoV4(
        vaultAddress!,
        positionRouterAddress!,
        nativeTokenAddress!,
        expandDecimals(1, 18),
        whitelistedTokenAddresses
      ),
    staleTime: sTimeVTI,
    cacheTime: sTimeVTI * CACHE_TIME_MULT,
    opts
  })

  const indexPricesUrl = getServerUrl(chainId, '/prices')
  const sTimeIPP = getStaleTime(CACHE_SECOND * 5, opts)
  const indexPricesPromise = cacheFetch({
    key: [GMXV1_CACHE_PREFIX, 'indexPricesFetch', indexPricesUrl],
    fn: () => fetch(indexPricesUrl).then((res) => res.json()),
    staleTime: sTimeIPP,
    cacheTime: sTimeIPP * CACHE_TIME_MULT,
    opts
  })

  const [vaultTokenInfo, { data: indexPrices }] = await Promise.all([vaultTokenInfoPromise, indexPricesPromise])

  return {
    infoTokens: getInfoTokens(
      tokens,
      tokenBalances,
      whitelistedTokens,
      vaultTokenInfo,
      fundingRateInfo,
      vaultPropsLength,
      indexPrices,
      nativeTokenAddress!
    )
  }
}

export function getTriggerPrice(
  tokenAddress: string,
  max: boolean,
  info: TokenInfo,
  orderOption?: string,
  triggerPriceUsd?: BigNumber
) {
  // Limit/stop orders are executed with price specified by user
  if (orderOption && orderOption !== MARKET && triggerPriceUsd) {
    return triggerPriceUsd
  }

  // Market orders are executed with current market price
  if (!info) {
    return
  }
  if (max && !info.maxPrice) {
    return
  }
  if (!max && !info.minPrice) {
    return
  }
  return max ? info.maxPrice : info.minPrice
}

export function getUsd(
  amount: BigNumber | undefined,
  tokenAddress: string,
  max: boolean,
  infoTokens: InfoTokens,
  orderOption?: string,
  triggerPriceUsd?: BigNumber
) {
  if (!amount) {
    return
  }
  if (tokenAddress === USDG_ADDRESS) {
    return amount.mul(PRECISION).div(expandDecimals(1, 18))
  }
  const info = getTokenInfo(infoTokens, tokenAddress)
  const price = getTriggerPrice(tokenAddress, max, info, orderOption, triggerPriceUsd)
  if (!price) {
    return
  }

  return amount.mul(price).div(expandDecimals(1, info.decimals))
}

export function getPositions(
  chainId: number,
  positionQuery: ReturnType<typeof getPositionQuery>,
  positionData: BigNumber[],
  infoTokens: InfoTokens,
  includeDelta: boolean | undefined,
  showPnlAfterFees: boolean,
  account: string,
  pendingPositions: any,
  updatedPositions: any
) {
  const propsLength = getConstant(chainId, 'positionReaderPropsLength')
  const positions: any = []
  const positionsMap: any = {}

  if (!positionData) {
    return { positions, positionsMap }
  }

  const { collateralTokens, indexTokens, isLong } = positionQuery
  for (let i = 0; i < collateralTokens.length; i++) {
    const collateralToken = getTokenInfo(infoTokens, collateralTokens[i], true, getContract(chainId, 'NATIVE_TOKEN'))
    const indexToken = getTokenInfo(infoTokens, indexTokens[i], true, getContract(chainId, 'NATIVE_TOKEN'))
    const key = getPositionKey(account, collateralTokens[i], indexTokens[i], isLong[i])
    let contractKey
    if (account) {
      contractKey = getPositionContractKey(account, collateralTokens[i], indexTokens[i], isLong[i])
    }

    const position: any = {
      key,
      contractKey,
      collateralToken,
      indexToken,
      isLong: isLong[i],
      size: positionData[i * propsLength],
      collateral: positionData[i * propsLength + 1],
      averagePrice: positionData[i * propsLength + 2],
      entryFundingRate: positionData[i * propsLength + 3],
      cumulativeFundingRate: collateralToken.cumulativeFundingRate,
      hasRealisedProfit: positionData[i * propsLength + 4].eq(1),
      realisedPnl: positionData[i * propsLength + 5],
      lastIncreasedTime: positionData[i * propsLength + 6].toNumber(),
      hasProfit: positionData[i * propsLength + 7].eq(1),
      delta: positionData[i * propsLength + 8],
      markPrice: isLong[i] ? indexToken.minPrice : indexToken.maxPrice,
      originalCollateralToken: collateralTokens[i]
    }

    if (
      updatedPositions &&
      updatedPositions[key] &&
      updatedPositions[key].updatedAt &&
      updatedPositions[key].updatedAt + UPDATED_POSITION_VALID_DURATION > Date.now()
    ) {
      const updatedPosition = updatedPositions[key]
      position.size = updatedPosition.size
      position.collateral = updatedPosition.collateral
      position.averagePrice = updatedPosition.averagePrice
      position.entryFundingRate = updatedPosition.entryFundingRate
    }

    let fundingFee = getFundingFee(position)
    position.fundingFee = fundingFee ? fundingFee : bigNumberify(0)
    position.collateralAfterFee = position.collateral.sub(position.fundingFee)

    position.closingFee = position.size.mul(MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR)
    position.positionFee = position.size.mul(MARGIN_FEE_BASIS_POINTS).mul(2).div(BASIS_POINTS_DIVISOR)
    position.totalFees = position.positionFee.add(position.fundingFee)

    position.pendingDelta = position.delta

    if (position.collateral.gt(0)) {
      position.hasLowCollateral =
        position.collateralAfterFee.lt(0) || position.size.div(position.collateralAfterFee.abs()).gt(50)

      if (position.averagePrice && position.markPrice) {
        const priceDelta = position.averagePrice.gt(position.markPrice)
          ? position.averagePrice.sub(position.markPrice)
          : position.markPrice.sub(position.averagePrice)
        position.pendingDelta = position.size.mul(priceDelta).div(position.averagePrice)

        position.delta = position.pendingDelta

        if (position.isLong) {
          position.hasProfit = position.markPrice.gte(position.averagePrice)
        } else {
          position.hasProfit = position.markPrice.lte(position.averagePrice)
        }
      }

      position.deltaPercentage = position.pendingDelta.mul(BASIS_POINTS_DIVISOR).div(position.collateral)

      const { deltaStr, deltaPercentageStr } = getDeltaStr({
        delta: position.pendingDelta,
        deltaPercentage: position.deltaPercentage,
        hasProfit: position.hasProfit
      })

      position.deltaStr = deltaStr
      position.deltaPercentageStr = deltaPercentageStr
      position.deltaBeforeFeesStr = deltaStr

      let hasProfitAfterFees
      let pendingDeltaAfterFees

      if (position.hasProfit) {
        if (position.pendingDelta.gt(position.totalFees)) {
          hasProfitAfterFees = true
          pendingDeltaAfterFees = position.pendingDelta.sub(position.totalFees)
        } else {
          hasProfitAfterFees = false
          pendingDeltaAfterFees = position.totalFees.sub(position.pendingDelta)
        }
      } else {
        hasProfitAfterFees = false
        pendingDeltaAfterFees = position.pendingDelta.add(position.totalFees)
      }

      position.hasProfitAfterFees = hasProfitAfterFees
      position.pendingDeltaAfterFees = pendingDeltaAfterFees
      // while calculating delta percentage after fees, we need to add opening fee (which is equal to closing fee) to collateral
      position.deltaPercentageAfterFees = position.pendingDeltaAfterFees
        .mul(BASIS_POINTS_DIVISOR)
        .div(position.collateral.add(position.closingFee))

      const { deltaStr: deltaAfterFeesStr, deltaPercentageStr: deltaAfterFeesPercentageStr } = getDeltaStr({
        delta: position.pendingDeltaAfterFees,
        deltaPercentage: position.deltaPercentageAfterFees,
        hasProfit: hasProfitAfterFees
      })

      position.deltaAfterFeesStr = deltaAfterFeesStr
      position.deltaAfterFeesPercentageStr = deltaAfterFeesPercentageStr

      if (showPnlAfterFees) {
        position.deltaStr = position.deltaAfterFeesStr
        position.deltaPercentageStr = position.deltaAfterFeesPercentageStr
      }

      let netValue = position.hasProfit
        ? position.collateral.add(position.pendingDelta)
        : position.collateral.sub(position.pendingDelta)

      netValue = netValue.sub(position.fundingFee).sub(position.closingFee)
      position.netValue = netValue
    }

    position.leverage = getLeverage({
      size: position.size,
      collateral: position.collateral,
      fundingFee: position.fundingFee,
      hasProfit: position.hasProfit,
      delta: position.delta,
      includeDelta
    })

    position.leverageStr = getLeverageStr(position.leverage)

    positionsMap[key] = position

    applyPendingChanges(position, pendingPositions)

    if (position.size.gt(0) || position.hasPendingChanges) {
      positions.push(position)
    }
  }

  return { positions, positionsMap }
}

export function calculatePositionDelta(
  price: BigNumber,
  size: BigNumber,
  collateral: BigNumber,
  isLong: boolean,
  averagePrice: BigNumber,
  lastIncreasedTime: number,
  sizeDelta: BigNumber | undefined
) {
  if (!sizeDelta) {
    sizeDelta = size
  }
  const priceDelta = averagePrice.gt(price) ? averagePrice.sub(price) : price.sub(averagePrice)
  let delta = sizeDelta.mul(priceDelta).div(averagePrice)
  const pendingDelta = delta

  const minProfitExpired = lastIncreasedTime + MIN_PROFIT_TIME < Date.now() / 1000
  const hasProfit = isLong ? price.gt(averagePrice) : price.lt(averagePrice)
  if (!minProfitExpired && hasProfit && delta.mul(BASIS_POINTS_DIVISOR).lte(size.mul(MIN_PROFIT_BIPS))) {
    delta = BigNumber.from(0)
  }

  const deltaPercentage = delta.mul(BASIS_POINTS_DIVISOR).div(collateral)
  const pendingDeltaPercentage = pendingDelta.mul(BASIS_POINTS_DIVISOR).div(collateral)

  return {
    delta,
    pendingDelta,
    pendingDeltaPercentage,
    hasProfit,
    deltaPercentage
  }
}

function getNextAveragePrice(
  size: BigNumber,
  sizeDelta: BigNumber,
  hasProfit: boolean,
  delta: BigNumber,
  nextPrice: BigNumber,
  isLong: boolean
) {
  if (!size || !sizeDelta || !delta || !nextPrice) {
    return
  }
  const nextSize = size.add(sizeDelta)
  let divisor
  if (isLong) {
    divisor = hasProfit ? nextSize.add(delta) : nextSize.sub(delta)
  } else {
    divisor = hasProfit ? nextSize.sub(delta) : nextSize.add(delta)
  }
  if (!divisor || divisor.eq(0)) {
    return
  }
  const nextAveragePrice = nextPrice.mul(nextSize).div(divisor)
  return nextAveragePrice
}

function getMarginFee(sizeDelta: BigNumber) {
  if (!sizeDelta) {
    return BigNumber.from(0)
  }
  const afterFeeUsd = sizeDelta.mul(BASIS_POINTS_DIVISOR - MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR)
  return sizeDelta.sub(afterFeeUsd)
}

function getNextData(
  isMarketOrder: boolean,
  entryMarkPrice: BigNumber,
  triggerPriceUsd: BigNumber,
  existingPosition: ExtendedPosition | undefined,
  isLong: boolean,
  toUsdMax: BigNumber
) {
  let nextAveragePrice = isMarketOrder ? entryMarkPrice : triggerPriceUsd
  let nextDelta = BigNumber.from(0)
  let nextHasProfit = false
  if (existingPosition) {
    if (isMarketOrder) {
      nextDelta = existingPosition.delta!
      nextHasProfit = existingPosition.hasProfit!
    } else {
      const data = calculatePositionDelta(
        triggerPriceUsd || BigNumber.from(0),
        existingPosition.size,
        existingPosition.collateral,
        existingPosition.direction == 'LONG',
        existingPosition.averageEntryPrice,
        existingPosition.lastUpdatedAtTimestamp!,
        undefined
      )
      nextDelta = data.delta
      nextHasProfit = data.hasProfit
    }

    let tempNextAveragePrice = getNextAveragePrice(
      existingPosition.size,
      toUsdMax,
      nextHasProfit,
      nextDelta,
      isMarketOrder ? entryMarkPrice : triggerPriceUsd,
      isLong
    )

    if (tempNextAveragePrice) {
      nextAveragePrice = tempNextAveragePrice
    }
  }
  return { nextAveragePrice, nextDelta, nextHasProfit }
}

function getNextDataForClose(position: any, isMarketOrder: boolean, triggerPriceUsd: BigNumber | undefined) {
  let nextDelta = BigNumber.from(0)
  let nextHasProfit = false
  if (!position) {
    return { nextDelta, nextHasProfit }
  }

  if (isMarketOrder) {
    nextDelta = position.delta!
    nextHasProfit = position.hasProfit!
    return { nextDelta, nextHasProfit }
  }

  if (!triggerPriceUsd) {
    return { nextDelta, nextHasProfit }
  }

  const { delta, hasProfit, deltaPercentage } = calculatePositionDelta(
    triggerPriceUsd,
    position.size,
    position.collateral,
    position.direction ? position.direction == 'LONG' : position.isLong,
    position.averageEntryPrice ? position.averageEntryPrice : position.averagePrice,
    position.lastUpdatedAtTimestamp ? position.lastUpdatedAtTimestamp : position.lastIncreasedTime,
    undefined
  )
  nextDelta = delta
  nextHasProfit = hasProfit

  return { nextDelta, nextHasProfit }
}

function calculateNextCollateralAndReceiveUsd(
  collateral: BigNumber | undefined,
  hasProfit: boolean,
  isClosing: boolean,
  adjustedDelta: BigNumber,
  collateralDelta: BigNumber | undefined,
  totalFees: BigNumber
) {
  let nextCollateral = BigNumber.from(0)
  let receiveUsd = BigNumber.from(0)

  if (collateral) {
    nextCollateral = collateral

    if (hasProfit) {
      receiveUsd = receiveUsd.add(adjustedDelta)
    } else {
      nextCollateral = nextCollateral.sub(adjustedDelta)
    }

    if (collateralDelta && collateralDelta.gt(0)) {
      receiveUsd = receiveUsd.add(collateralDelta)
      nextCollateral = nextCollateral.sub(collateralDelta)
    }
    if (isClosing) {
      receiveUsd = receiveUsd.add(nextCollateral)
      nextCollateral = BigNumber.from(0)
    }
    if (receiveUsd.gt(totalFees)) {
      receiveUsd = receiveUsd.sub(totalFees)
    } else {
      nextCollateral = nextCollateral!.sub(totalFees)
    }
  }

  return { nextCollateral, receiveUsd }
}

export const getEditCollateralPreviewInternal = async (
  provider: Provider,
  position: ExtendedPosition,
  marginDelta: BigNumber, // always in token terms
  isDeposit: boolean,
  convertToToken: any,
  execFee: BigNumber,
  opts?: ApiOpts
): Promise<ExtendedPosition> => {
  let fromAmount = marginDelta
  // fromAmount = isDeposit ? fromAmount : fromAmount.mul(expandDecimals(1, 30 - Number(collateralToken.decimals)))
  let fromAmountUsd: BigNumber

  const { infoTokens } = await useInfoTokens(provider, ARBITRUM, false, undefined, undefined, undefined, opts)

  // if (isDeposit) {
  fromAmountUsd = getUsd(fromAmount, position.collateralToken.address, false, infoTokens)!
  // } else {
  //   fromAmountUsd = fromAmount
  //     .mul(expandDecimals(1, Number(collateralToken.decimals)))
  //     .div(getTokenInfo(infoTokens, position.collateralToken.address, undefined, undefined).maxPrice!)
  // }

  let collateralDelta = fromAmountUsd
  let depositFeeUSD = BigNumber.from(0)

  if (position.direction == 'LONG' && isDeposit) {
    collateralDelta = fromAmountUsd.mul(BASIS_POINTS_DIVISOR - DEPOSIT_FEE).div(BASIS_POINTS_DIVISOR)
    depositFeeUSD = fromAmountUsd.mul(DEPOSIT_FEE).div(BASIS_POINTS_DIVISOR)
  }

  let nextCollateral = isDeposit
    ? position.collateralAfterFee!.add(collateralDelta)
    : position.collateralAfterFee!.sub(collateralDelta)

  let nextLeverage = getLeverage({
    size: position.size,
    collateral: nextCollateral,
    hasProfit: position.hasProfit,
    delta: position.delta,
    includeDelta: false
  })

  let nextLeverageExcludingPnl = getLeverage({
    size: position.size,
    collateral: nextCollateral,
    hasProfit: position.hasProfit,
    delta: position.delta,
    includeDelta: false
  })

  // nextCollateral is prev collateral + deposit amount - borrow fee - deposit fee
  // in case of withdrawal nextCollateral is prev collateral - withdraw amount - borrow fee
  let nextLiquidationPrice = getLiquidationPrice({
    isLong: position.direction == 'LONG',
    size: position.size,
    collateral: nextCollateral,
    averagePrice: position.averageEntryPrice
  })

  let executionFees = getUsd(execFee, getContract(ARBITRUM, 'NATIVE_TOKEN')!, false, infoTokens)
  depositFeeUSD = depositFeeUSD.add(executionFees || BigNumber.from(0))

  return {
    indexOrIdentifier: '',
    leverage: nextLeverage,
    size: position.size,
    collateral: nextCollateral,
    collateralToken:
      position.direction == 'LONG'
        ? convertToToken(getToken(ARBITRUM, position.indexToken!.address)!)
        : convertToToken(getTokenBySymbol(ARBITRUM, 'USDC.e')!),
    averageEntryPrice: position.averageEntryPrice,
    liqudationPrice: nextLiquidationPrice,
    fee: depositFeeUSD
  }
}

export const getEditCollateralPreviewInternalV1 = async (
  wallet: string,
  isDeposit: boolean,
  marginDelta: AmountInfo,
  existingPos: PositionInfo,
  executionFee: BigNumber,
  opts?: ApiOpts | undefined
): Promise<PreviewInfo> => {
  let collateralToken = existingPos.collateral
  let provider = rpc[ARBITRUM]
  let position = existingPos.metadata
  let isLong = position.direction ? position.direction == 'LONG' : position.isLong

  let fromAmount = getBNFromFN(marginDelta.amount)
  // fromAmount = isDeposit ? fromAmount : fromAmount.mul(expandDecimals(1, 30 - Number(collateralToken.decimals)))
  let fromAmountUsd: BigNumber

  const { infoTokens } = await useInfoTokens(provider, ARBITRUM, false, undefined, undefined, undefined, opts)

  // if (isDeposit) {
  fromAmountUsd = getUsd(fromAmount, collateralToken.address[ARBITRUM]!, false, infoTokens)!
  // } else {
  //   fromAmountUsd = fromAmount
  //     .mul(expandDecimals(1, Number(collateralToken.decimals)))
  //     .div(getTokenInfo(infoTokens, collateralToken.address[ARBITRUM]!, undefined, undefined).maxPrice!)
  // }

  let collateralDelta = fromAmountUsd
  let depositFeeUSD = BigNumber.from(0)

  if (isLong && isDeposit) {
    collateralDelta = fromAmountUsd.mul(BASIS_POINTS_DIVISOR - DEPOSIT_FEE).div(BASIS_POINTS_DIVISOR)
    depositFeeUSD = fromAmountUsd.mul(DEPOSIT_FEE).div(BASIS_POINTS_DIVISOR)
  }

  let nextCollateral = isDeposit
    ? position.collateralAfterFee!.add(collateralDelta)
    : position.collateralAfterFee!.sub(collateralDelta)

  let nextLeverage = getLeverage({
    size: position.size,
    collateral: nextCollateral,
    hasProfit: position.hasProfit,
    delta: position.delta,
    includeDelta: false
  })

  // let nextLeverageExcludingPnl = getLeverage({
  //   size: position.size,
  //   collateral: nextCollateral,
  //   hasProfit: position.hasProfit,
  //   delta: position.delta,
  //   includeDelta: false
  // })

  // nextCollateral is prev collateral + deposit amount - borrow fee - deposit fee
  // in case of withdrawal nextCollateral is prev collateral - withdraw amount - borrow fee
  let nextLiquidationPrice = getLiquidationPrice({
    isLong: isLong,
    size: position.size,
    collateral: nextCollateral,
    averagePrice: position.averageEntryPrice ? position.averageEntryPrice : position.averagePrice
  })

  let executionFees = getUsd(executionFee, getContract(ARBITRUM, 'NATIVE_TOKEN')!, false, infoTokens)
  depositFeeUSD = depositFeeUSD.add(executionFees || BigNumber.from(0))

  return {
    marketId: existingPos.marketId,
    collateral:
      position.direction == 'LONG'
        ? getTokenByAddress(position.indexToken!.address)!
        : getTokenBySymbolCommon('USDC.e')!,
    leverage: nextLeverage ? FixedNumber.fromValue(nextLeverage.toString(), 4, 4) : FixedNumber.fromString('0'),
    size: toAmountInfo(position.size, 30, false),
    margin: toAmountInfo(nextCollateral, 30, false),
    avgEntryPrice: FixedNumber.fromValue(position.averagePrice.toString(), 30, 30),
    liqudationPrice: nextLiquidationPrice
      ? FixedNumber.fromValue(nextLiquidationPrice.toString(), 30, 30)
      : FixedNumber.fromString('0'),
    fee: FixedNumber.fromValue(depositFeeUSD.toString(), 30, 30),
    isError: false,
    errMsg: ''
  }
}

function applySpread(amount: BigNumber, spread: BigNumber | undefined) {
  if (!amount || !spread) {
    return amount
  }
  return amount.sub(amount.mul(spread).div(PRECISION))
}

export function getTokenAmountFromUsd(
  infoTokens: InfoTokens,
  tokenAddress: string,
  usdAmount?: BigNumber,
  opts: {
    max?: boolean
    overridePrice?: BigNumber
  } = {}
) {
  if (!usdAmount) {
    return
  }

  if (tokenAddress === USDG_ADDRESS) {
    return usdAmount.mul(expandDecimals(1, 18)).div(PRECISION)
  }

  const info: TokenInfo | undefined = getTokenInfo(infoTokens, tokenAddress)

  if (!info) {
    return
  }

  const price = opts.overridePrice || (opts.max ? info.maxPrice : info.minPrice)

  if (!BigNumber.isBigNumber(price) || price.lte(0)) {
    return
  }

  return usdAmount.mul(expandDecimals(1, info.decimals)).div(price)
}

function shouldSwap(collateralToken: TokenInfo, receiveToken: TokenInfo) {
  // If position collateral is WETH in contract, then position.collateralToken is { symbol: “ETH”, isNative: true, … }
  // @see https://github.com/gmx-io/gmx-interface/blob/master/src/pages/Exchange/Exchange.js#L162
  // meaning if collateralToken.isNative === true in reality position has WETH as a collateral
  // and if collateralToken.isNative === true and receiveToken.isNative === true then position’s WETH will be unwrapped and user will receive native ETH
  const isCollateralWrapped = collateralToken.isNative

  const isSameToken =
    collateralToken.address === receiveToken.address || (isCollateralWrapped && receiveToken.isWrapped)

  const isUnwrap = isCollateralWrapped && receiveToken.isNative

  return !isSameToken && !isUnwrap
}

export const getCloseTradePreviewInternal = async (
  provider: Provider,
  position: ExtendedPosition,
  closeSize: BigNumber,
  execFee: BigNumber,
  isTrigger: boolean,
  triggerPrice: BigNumber | undefined,
  outputToken: GToken | undefined,
  convertToToken: any,
  opts?: ApiOpts
): Promise<ExtendedPosition> => {
  let liquidationPrice: BigNumber | undefined
  let nextLiquidationPrice: BigNumber | undefined
  let keepLeverage = false
  let isClosing = closeSize.eq(position.size)
  let fromAmount = closeSize
  let sizeDelta = fromAmount
  let receiveUsd = BigNumber.from(0)
  let receiveAmount = BigNumber.from(0)
  let swapFee = BigNumber.from(0)
  let nextCollateral: BigNumber | undefined
  let adjustedDelta = BigNumber.from(0)
  let collateralDelta = BigNumber.from(0)
  let totalFees = BigNumber.from(0)
  let positionFee = getMarginFee(fromAmount)
  let fundingFee = position.borrowFee!
  let nextLeverage
  const usdgToken = IERC20__factory.connect(USDG_ADDRESS, provider)

  liquidationPrice = getLiquidationPrice({
    size: position.size,
    collateral: position.collateral,
    averagePrice: position.averageEntryPrice,
    isLong: position.direction == 'LONG',
    fundingFee: position.borrowFee
  })

  let { nextDelta, nextHasProfit } = getNextDataForClose(position, !isTrigger, triggerPrice)

  let leverageWithoutDelta = getLeverage({
    size: position.size,
    collateral: position.collateral,
    fundingFee: fundingFee
  })
  nextLeverage = position.leverage!
  let nextLeverageWithoutDelta = leverageWithoutDelta

  // if (isClosing) {
  //   sizeDelta = position.size;
  // } else if (isTrigger && sizeDelta && existingOrders.length > 0) {
  //   let residualSize = position.size;
  //   for (const order of existingOrders) {
  //     residualSize = residualSize.sub(order.sizeDelta);
  //   }
  //   if (residualSize.sub(sizeDelta).abs().lt(ORDER_SIZE_DUST_USD)) {
  //     sizeDelta = residualSize;
  //   }
  // }

  if (sizeDelta && position.size.gt(0)) {
    adjustedDelta = nextDelta.mul(sizeDelta).div(position.size)
  }

  totalFees = totalFees.add(positionFee || BigNumber.from(0)).add(fundingFee || BigNumber.from(0))
  ;({ receiveUsd, nextCollateral } = calculateNextCollateralAndReceiveUsd(
    position.collateral,
    nextHasProfit,
    isClosing,
    adjustedDelta,
    collateralDelta,
    totalFees
  ))

  if (fromAmount) {
    positionFee = getMarginFee(fromAmount)
  }

  const sTimeUS = getStaleTime(CACHE_SECOND * 5, opts)
  const usdgSupplyPromise = cacheFetch({
    key: [GMXV1_CACHE_PREFIX, 'usdgSupply'],
    fn: () => usdgToken.totalSupply(),
    staleTime: sTimeUS,
    cacheTime: sTimeUS * CACHE_TIME_MULT,
    opts
  })
  const infoTokensPromise = useInfoTokens(provider, ARBITRUM, false, undefined, undefined, undefined, opts)
  const [usdgSupply, { infoTokens }] = await Promise.all([usdgSupplyPromise, infoTokensPromise])

  let collateralTokenInfo = getTokenInfo(infoTokens, position.originalCollateralToken!)
  let receiveTokenInfo = outputToken ? getTokenInfo(infoTokens, outputToken.address) : undefined

  receiveUsd = applySpread(receiveUsd, collateralTokenInfo?.spread)

  let convertedAmount = fromAmount
    .mul(expandDecimals(1, Number(position.collateralToken.decimals)))
    .div(collateralTokenInfo.maxPrice!)

  // Calculate swap fees
  if (!isTrigger && outputToken) {
    const { feeBasisPoints } = getNextToAmount(
      ARBITRUM,
      convertedAmount,
      position.originalCollateralToken!,
      outputToken.address,
      infoTokens,
      undefined,
      undefined,
      usdgSupply,
      100001,
      true
    )

    if (feeBasisPoints) {
      swapFee = receiveUsd.mul(feeBasisPoints).div(BASIS_POINTS_DIVISOR)
      totalFees = totalFees.add(swapFee || bigNumberify(0))
      receiveUsd = receiveUsd.sub(swapFee)
    }
    const swapToTokenInfo = getTokenInfo(infoTokens, outputToken.address)
    receiveUsd = applySpread(receiveUsd, swapToTokenInfo?.spread)
  }

  if (fromAmount) {
    if (!isClosing) {
      nextLiquidationPrice = getLiquidationPrice({
        size: position.size.sub(sizeDelta),
        collateral: nextCollateral,
        averagePrice: position.averageEntryPrice,
        isLong: position.direction == 'LONG'
      })

      if (!keepLeverage) {
        // We need to send the remaining delta
        const remainingDelta = nextDelta?.sub(adjustedDelta)
        nextLeverage = getLeverage({
          size: position.size.sub(sizeDelta),
          collateral: nextCollateral,
          hasProfit: nextHasProfit,
          delta: remainingDelta,
          includeDelta: false
        })

        nextLeverageWithoutDelta = getLeverage({
          size: position.size.sub(sizeDelta),
          collateral: nextCollateral,
          hasProfit: nextHasProfit,
          delta: remainingDelta,
          includeDelta: false
        })
      }
    }
  }

  // For Shorts trigger orders the collateral is a stable coin, it should not depend on the triggerPrice
  if (isTrigger && position.direction == 'LONG') {
    receiveAmount = getTokenAmountFromUsd(
      infoTokens,
      outputToken ? outputToken.address : position.originalCollateralToken!,
      receiveUsd
      // Not needed because we are allowing collateral swap
      // {
      //   overridePrice: triggerPrice,
      // }
    )!
  } else {
    receiveAmount = getTokenAmountFromUsd(infoTokens, outputToken!.address, receiveUsd)!
  }

  let executionFees = getUsd(execFee, getContract(ARBITRUM, 'NATIVE_TOKEN')!, false, infoTokens)
  totalFees = totalFees.add(executionFees || BigNumber.from(0))

  let isNotEnoughReceiveTokenLiquidity = false
  let isCollateralPoolCapacityExceeded = false

  // Check swap limits (max in / max out)
  if (!isTrigger && receiveTokenInfo && shouldSwap(collateralTokenInfo, receiveTokenInfo)) {
    isNotEnoughReceiveTokenLiquidity =
      receiveTokenInfo.availableAmount!.lt(receiveAmount) ||
      receiveTokenInfo.bufferAmount!.gt(receiveTokenInfo.poolAmount!.sub(receiveAmount))

    if (
      collateralTokenInfo.maxUsdgAmount &&
      collateralTokenInfo.maxUsdgAmount.gt(0) &&
      collateralTokenInfo.usdgAmount &&
      collateralTokenInfo.maxPrice
    ) {
      const usdgFromAmount = adjustForDecimals(receiveUsd, USD_DECIMALS, USDG_DECIMALS)
      const nextUsdgAmount = collateralTokenInfo.usdgAmount.add(usdgFromAmount)

      if (nextUsdgAmount.gt(collateralTokenInfo.maxUsdgAmount)) {
        isCollateralPoolCapacityExceeded = true
      }
    }
  }

  let isError = isNotEnoughReceiveTokenLiquidity || isCollateralPoolCapacityExceeded

  return {
    indexOrIdentifier: '',
    leverage: isClosing ? BigNumber.from(0) : nextLeverage,
    size: isClosing ? BigNumber.from(0) : position.size.sub(sizeDelta),
    collateral: isClosing ? BigNumber.from(0) : nextCollateral,
    collateralToken:
      position.direction == 'LONG'
        ? convertToToken(getToken(ARBITRUM, position.indexToken!.address)!)
        : convertToToken(getTokenBySymbol(ARBITRUM, 'USDC.e')!),
    averageEntryPrice: position.averageEntryPrice,
    liqudationPrice: isClosing ? BigNumber.from(0) : nextLiquidationPrice,
    fee: totalFees,
    receiveAmount: receiveAmount,
    receiveUsd: receiveUsd,
    isError: isError,
    error: isError ? 'Insufficient Liquidity for Collateral Swap' : ''
  }
}

export const getCloseTradePreviewInternalV1 = async (
  positionInfo: PositionInfo,
  closePositionData: ClosePositionData,
  executionFee: BigNumber,
  opts?: ApiOpts | undefined
): Promise<CloseTradePreviewInfo> => {
  let closeSize = getBNFromFN(closePositionData.closeSize.amount)
  let position = positionInfo.metadata
  let provider = rpc[ARBITRUM]

  let liquidationPrice: BigNumber | undefined
  let nextLiquidationPrice: BigNumber | undefined
  let keepLeverage = false
  let isClosing = closeSize.eq(position.size)
  let fromAmount = closeSize
  let sizeDelta = fromAmount
  let receiveUsd = BigNumber.from(0)
  let receiveAmount = BigNumber.from(0)
  let swapFee = BigNumber.from(0)
  let nextCollateral: BigNumber | undefined
  let adjustedDelta = BigNumber.from(0)
  let collateralDelta = BigNumber.from(0)
  let totalFees = BigNumber.from(0)
  let positionFee = getMarginFee(fromAmount)
  let fundingFee = position.borrowFee ? position.borrowFee : position.fundingFee
  let nextLeverage
  const usdgToken = IERC20__factory.connect(USDG_ADDRESS, provider)
  let isTrigger = closePositionData.type !== 'MARKET'
  let triggerPrice = isTrigger ? getBNFromFN(closePositionData.triggerData!.triggerPrice) : undefined

  liquidationPrice = getLiquidationPrice({
    size: position.size,
    collateral: position.collateral,
    averagePrice: position.averageEntryPrice ? position.averageEntryPrice : position.averagePrice,
    isLong: position.direction ? position.direction == 'LONG' : position.isLong,
    fundingFee: position.borrowFee ? position.borrowFee : position.fundingFee
  })

  let { nextDelta, nextHasProfit } = getNextDataForClose(position, !isTrigger, triggerPrice)

  let leverageWithoutDelta = getLeverage({
    size: position.size,
    collateral: position.collateral,
    fundingFee: fundingFee
  })
  nextLeverage = position.leverage!
  let nextLeverageWithoutDelta = leverageWithoutDelta

  // if (isClosing) {
  //   sizeDelta = position.size;
  // } else if (isTrigger && sizeDelta && existingOrders.length > 0) {
  //   let residualSize = position.size;
  //   for (const order of existingOrders) {
  //     residualSize = residualSize.sub(order.sizeDelta);
  //   }
  //   if (residualSize.sub(sizeDelta).abs().lt(ORDER_SIZE_DUST_USD)) {
  //     sizeDelta = residualSize;
  //   }
  // }

  if (sizeDelta && position.size.gt(0)) {
    adjustedDelta = nextDelta.mul(sizeDelta).div(position.size)
  }

  totalFees = totalFees.add(positionFee || BigNumber.from(0)).add(fundingFee || BigNumber.from(0))
  ;({ receiveUsd, nextCollateral } = calculateNextCollateralAndReceiveUsd(
    position.collateral,
    nextHasProfit,
    isClosing,
    adjustedDelta,
    collateralDelta,
    totalFees
  ))

  if (fromAmount) {
    positionFee = getMarginFee(fromAmount)
  }

  const sTimeUS = getStaleTime(CACHE_SECOND * 5, opts)
  const usdgSupplyPromise = cacheFetch({
    key: [GMXV1_CACHE_PREFIX, 'usdgSupply'],
    fn: () => usdgToken.totalSupply(),
    staleTime: sTimeUS,
    cacheTime: sTimeUS * CACHE_TIME_MULT,
    opts
  })
  const infoTokensPromise = useInfoTokens(provider, ARBITRUM, false, undefined, undefined, undefined, opts)
  const [usdgSupply, { infoTokens }] = await Promise.all([usdgSupplyPromise, infoTokensPromise])

  let collateralTokenInfo = getTokenInfo(infoTokens, position.originalCollateralToken!)
  const outputToken = closePositionData.outputCollateral
  let receiveTokenInfo = outputToken ? getTokenInfo(infoTokens, outputToken.address[ARBITRUM]!) : undefined

  receiveUsd = applySpread(receiveUsd, collateralTokenInfo?.spread)

  let convertedAmount = fromAmount
    .mul(expandDecimals(1, Number(position.collateralToken.decimals)))
    .div(collateralTokenInfo.maxPrice!)

  // Calculate swap fees
  if (!isTrigger && outputToken) {
    const { feeBasisPoints } = getNextToAmount(
      ARBITRUM,
      convertedAmount,
      position.originalCollateralToken!,
      outputToken.address[ARBITRUM]!,
      infoTokens,
      undefined,
      undefined,
      usdgSupply,
      100001,
      true
    )

    if (feeBasisPoints) {
      swapFee = receiveUsd.mul(feeBasisPoints).div(BASIS_POINTS_DIVISOR)
      totalFees = totalFees.add(swapFee || bigNumberify(0))
      receiveUsd = receiveUsd.sub(swapFee)
    }
    const swapToTokenInfo = getTokenInfo(infoTokens, outputToken.address[ARBITRUM]!)
    receiveUsd = applySpread(receiveUsd, swapToTokenInfo?.spread)
  }

  if (fromAmount) {
    if (!isClosing) {
      nextLiquidationPrice = getLiquidationPrice({
        size: position.size.sub(sizeDelta),
        collateral: nextCollateral,
        averagePrice: position.averageEntryPrice ? position.averageEntryPrice : position.averagePrice,
        isLong: position.direction ? position.direction == 'LONG' : position.isLong
      })

      if (!keepLeverage) {
        // We need to send the remaining delta
        const remainingDelta = nextDelta?.sub(adjustedDelta)
        nextLeverage = getLeverage({
          size: position.size.sub(sizeDelta),
          collateral: nextCollateral,
          hasProfit: nextHasProfit,
          delta: remainingDelta,
          includeDelta: false
        })

        nextLeverageWithoutDelta = getLeverage({
          size: position.size.sub(sizeDelta),
          collateral: nextCollateral,
          hasProfit: nextHasProfit,
          delta: remainingDelta,
          includeDelta: false
        })
      }
    }
  }

  // For Shorts trigger orders the collateral is a stable coin, it should not depend on the triggerPrice
  if (isTrigger && position.direction == 'LONG') {
    receiveAmount = getTokenAmountFromUsd(
      infoTokens,
      outputToken ? outputToken.address : position.originalCollateralToken!,
      receiveUsd
      // Not needed because we are allowing collateral swap
      // {
      //   overridePrice: triggerPrice,
      // }
    )!
  } else {
    receiveAmount = getTokenAmountFromUsd(infoTokens, outputToken!.address[ARBITRUM]!, receiveUsd)!
  }

  let executionFees = getUsd(executionFee, getContract(ARBITRUM, 'NATIVE_TOKEN')!, false, infoTokens)
  totalFees = totalFees.add(executionFees || BigNumber.from(0))

  let isNotEnoughReceiveTokenLiquidity = false
  let isCollateralPoolCapacityExceeded = false

  // Check swap limits (max in / max out)
  if (!isTrigger && receiveTokenInfo && shouldSwap(collateralTokenInfo, receiveTokenInfo)) {
    isNotEnoughReceiveTokenLiquidity =
      receiveTokenInfo.availableAmount!.lt(receiveAmount) ||
      receiveTokenInfo.bufferAmount!.gt(receiveTokenInfo.poolAmount!.sub(receiveAmount))

    if (
      collateralTokenInfo.maxUsdgAmount &&
      collateralTokenInfo.maxUsdgAmount.gt(0) &&
      collateralTokenInfo.usdgAmount &&
      collateralTokenInfo.maxPrice
    ) {
      const usdgFromAmount = adjustForDecimals(receiveUsd, USD_DECIMALS, USDG_DECIMALS)
      const nextUsdgAmount = collateralTokenInfo.usdgAmount.add(usdgFromAmount)

      if (nextUsdgAmount.gt(collateralTokenInfo.maxUsdgAmount)) {
        isCollateralPoolCapacityExceeded = true
      }
    }
  }

  let isError = isNotEnoughReceiveTokenLiquidity || isCollateralPoolCapacityExceeded

  return {
    marketId: positionInfo.marketId,
    collateral:
      position.direction == 'LONG'
        ? getTokenByAddress(position.indexToken!.address)!
        : getTokenBySymbolCommon('USDC.e')!,
    leverage: isClosing ? FixedNumber.fromString('0') : FixedNumber.fromValue(nextLeverage.toString(), 4, 4),
    size: isClosing ? toAmountInfo(ZERO, 30, false) : toAmountInfo(position.size.sub(sizeDelta), 30, false),
    margin: isClosing ? toAmountInfo(ZERO, 30, false) : toAmountInfo(nextCollateral, 30, false),
    avgEntryPrice: FixedNumber.fromValue(position.averagePrice.toString(), 30, 30),
    liqudationPrice:
      isClosing || nextLiquidationPrice === undefined
        ? FixedNumber.fromString('0')
        : FixedNumber.fromValue(nextLiquidationPrice.toString(), 30, 30),
    fee: FixedNumber.fromValue(totalFees.toString(), 30, 30),
    receiveMargin: toAmountInfo(receiveUsd, 30, false),
    isError: isError,
    errMsg: isError ? 'Insufficient Liquidity' : ''
  }
}

export function getTargetUsdgAmount(token: TokenInfo, usdgSupply: BigNumber, totalTokenWeights: BigNumber) {
  if (!token || !token.weight || !usdgSupply) {
    return
  }

  if (usdgSupply.eq(0)) {
    return BigNumber.from(0)
  }

  return token.weight.mul(usdgSupply).div(totalTokenWeights)
}

export function getFeeBasisPoints(
  token: TokenInfo | undefined,
  tokenUsdgAmount: BigNumber | undefined,
  usdgDelta: BigNumber,
  feeBasisPoints: BigNumber,
  taxBasisPoints: BigNumber,
  increment: boolean,
  usdgSupply: BigNumber,
  totalTokenWeights: BigNumber
) {
  if (!token || !tokenUsdgAmount || !usdgSupply || !totalTokenWeights) {
    return 0
  }

  const initialAmount = tokenUsdgAmount
  let nextAmount = initialAmount.add(usdgDelta)
  if (!increment) {
    nextAmount = usdgDelta.gt(initialAmount) ? BigNumber.from(0) : initialAmount.sub(usdgDelta)
  }

  const targetAmount = getTargetUsdgAmount(token, usdgSupply, totalTokenWeights)
  if (!targetAmount || targetAmount.eq(0)) {
    return feeBasisPoints.toNumber()
  }

  const initialDiff = initialAmount.gt(targetAmount) ? initialAmount.sub(targetAmount) : targetAmount.sub(initialAmount)
  const nextDiff = nextAmount.gt(targetAmount) ? nextAmount.sub(targetAmount) : targetAmount.sub(nextAmount)

  if (nextDiff.lt(initialDiff)) {
    const rebateBps = taxBasisPoints.mul(initialDiff).div(targetAmount)
    return rebateBps.gt(feeBasisPoints) ? 0 : feeBasisPoints.sub(rebateBps).toNumber()
  }

  let averageDiff = initialDiff.add(nextDiff).div(2)
  if (averageDiff.gt(targetAmount)) {
    averageDiff = targetAmount
  }
  const taxBps = taxBasisPoints.mul(averageDiff).div(targetAmount)
  return feeBasisPoints.add(taxBps).toNumber()
}

const adjustForDecimalsFactory = (n: number) => (number: any) => {
  if (n === 0) {
    return number
  }
  if (n > 0) {
    return number.mul(expandDecimals(1, n))
  }
  return number.div(expandDecimals(1, -n))
}

export function adjustForDecimals(amount: BigNumber, divDecimals: number, mulDecimals: number) {
  return amount.mul(expandDecimals(1, mulDecimals)).div(expandDecimals(1, divDecimals))
}

export function getSwapFeeBasisPoints(isStable: boolean | undefined) {
  return isStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS
}

export function getMostAbundantStableToken(chainId: number, infoTokens: InfoTokens) {
  const whitelistedTokens = getWhitelistedTokens(chainId)
  let availableAmount
  let stableToken = whitelistedTokens.find((t) => t.isStable)

  for (let i = 0; i < whitelistedTokens.length; i++) {
    const info = getTokenInfo(infoTokens, whitelistedTokens[i].address)
    if (!info.isStable || !info.availableAmount) {
      continue
    }

    const adjustedAvailableAmount = adjustForDecimals(info.availableAmount, info.decimals, USD_DECIMALS)
    if (!availableAmount || adjustedAvailableAmount.gt(availableAmount)) {
      availableAmount = adjustedAvailableAmount
      stableToken = info
    }
  }

  return stableToken as TokenInfo
}

export function getNextToAmount(
  chainId: number,
  fromAmount: BigNumber | undefined,
  fromTokenAddress: string,
  toTokenAddress: string,
  infoTokens: InfoTokens,
  toTokenPriceUsd: BigNumber | undefined,
  ratio: BigNumber | undefined,
  usdgSupply: BigNumber,
  totalTokenWeights: number,
  forSwap: boolean
) {
  const defaultValue = { amount: BigNumber.from(0), feeBasisPoints: undefined }
  if (!fromAmount || !fromTokenAddress || !toTokenAddress || !infoTokens) {
    return defaultValue
  }

  if (fromTokenAddress === toTokenAddress) {
    return { amount: fromAmount, feeBasisPoints: undefined }
  }

  const fromToken = getTokenInfo(infoTokens, fromTokenAddress)
  const toToken = getTokenInfo(infoTokens, toTokenAddress)

  if (fromToken.isNative && toToken.isWrapped) {
    return { amount: fromAmount, feeBasisPoints: undefined }
  }

  if (fromToken.isWrapped && toToken.isNative) {
    return { amount: fromAmount, feeBasisPoints: undefined }
  }

  // the realtime price should be used if it is for a transaction to open / close a position
  // or if the transaction involves doing a swap and opening / closing a position
  // otherwise use the contract price instead of realtime price for swaps

  let fromTokenMinPrice
  if (fromToken) {
    fromTokenMinPrice = forSwap ? fromToken.contractMinPrice : fromToken.minPrice
  }

  let toTokenMaxPrice
  if (toToken) {
    toTokenMaxPrice = forSwap ? toToken.contractMaxPrice : toToken.maxPrice
  }

  if (!fromTokenMinPrice || !toTokenMaxPrice) {
    return defaultValue
  }

  const adjustDecimals = adjustForDecimalsFactory(toToken.decimals - fromToken.decimals)

  let toAmountBasedOnRatio = bigNumberify(0)!
  if (ratio && !ratio.isZero()) {
    toAmountBasedOnRatio = fromAmount.mul(PRECISION).div(ratio)
  }

  if (toTokenAddress === USDG_ADDRESS) {
    const feeBasisPoints = getSwapFeeBasisPoints(fromToken.isStable)

    if (ratio && !ratio.isZero()) {
      const toAmount = toAmountBasedOnRatio
      return {
        amount: adjustDecimals(toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR)),
        feeBasisPoints
      }
    }

    const toAmount = fromAmount.mul(fromTokenMinPrice).div(PRECISION)
    return {
      amount: adjustDecimals(toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR)),
      feeBasisPoints
    }
  }

  if (fromTokenAddress === USDG_ADDRESS) {
    const redemptionValue = toToken.redemptionAmount
      ?.mul(toTokenPriceUsd || toTokenMaxPrice)
      .div(expandDecimals(1, toToken.decimals))

    if (redemptionValue && redemptionValue.gt(THRESHOLD_REDEMPTION_VALUE)) {
      const feeBasisPoints = getSwapFeeBasisPoints(toToken.isStable)

      const toAmount =
        ratio && !ratio.isZero()
          ? toAmountBasedOnRatio
          : fromAmount.mul(toToken.redemptionAmount!).div(expandDecimals(1, toToken.decimals))

      return {
        amount: adjustDecimals(toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR)),
        feeBasisPoints
      }
    }

    const expectedAmount = fromAmount

    const stableToken = getMostAbundantStableToken(chainId, infoTokens)
    if (!stableToken?.availableAmount || stableToken.availableAmount.lt(expectedAmount)) {
      const toAmount =
        ratio && !ratio.isZero()
          ? toAmountBasedOnRatio
          : fromAmount.mul(toToken.redemptionAmount!).div(expandDecimals(1, toToken.decimals))
      const feeBasisPoints = getSwapFeeBasisPoints(toToken.isStable)
      return {
        amount: adjustDecimals(toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR)),
        feeBasisPoints
      }
    }

    const feeBasisPoints0 = getSwapFeeBasisPoints(true)
    const feeBasisPoints1 = getSwapFeeBasisPoints(false)

    if (ratio && !ratio.isZero()) {
      const toAmount = toAmountBasedOnRatio
        .mul(BASIS_POINTS_DIVISOR - feeBasisPoints0 - feeBasisPoints1)
        .div(BASIS_POINTS_DIVISOR)
      return {
        amount: adjustDecimals(toAmount),
        path: [USDG_ADDRESS, stableToken.address, toToken.address],
        feeBasisPoints: feeBasisPoints0 + feeBasisPoints1
      }
    }

    // get toAmount for USDG => stableToken
    let toAmount = fromAmount.mul(PRECISION).div(stableToken.maxPrice!)
    // apply USDG => stableToken fees
    toAmount = toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints0).div(BASIS_POINTS_DIVISOR)

    // get toAmount for stableToken => toToken
    toAmount = toAmount.mul(stableToken.minPrice!).div(toTokenPriceUsd || toTokenMaxPrice)
    // apply stableToken => toToken fees
    toAmount = toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints1).div(BASIS_POINTS_DIVISOR)

    return {
      amount: adjustDecimals(toAmount),
      path: [USDG_ADDRESS, stableToken.address, toToken.address],
      feeBasisPoints: feeBasisPoints0 + feeBasisPoints1
    }
  }

  const toAmount =
    ratio && !ratio.isZero()
      ? toAmountBasedOnRatio
      : fromAmount.mul(fromTokenMinPrice).div(toTokenPriceUsd || toTokenMaxPrice)

  let usdgAmount = fromAmount.mul(fromTokenMinPrice).div(PRECISION)
  usdgAmount = adjustForDecimals(usdgAmount, fromToken.decimals, USDG_DECIMALS)
  const swapFeeBasisPoints =
    fromToken.isStable && toToken.isStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS
  const taxBasisPoints = fromToken.isStable && toToken.isStable ? STABLE_TAX_BASIS_POINTS : TAX_BASIS_POINTS
  const feeBasisPoints0 = getFeeBasisPoints(
    fromToken,
    fromToken.usdgAmount,
    usdgAmount,
    BigNumber.from(swapFeeBasisPoints),
    BigNumber.from(taxBasisPoints),
    true,
    usdgSupply,
    BigNumber.from(totalTokenWeights)
  )
  const feeBasisPoints1 = getFeeBasisPoints(
    toToken,
    toToken.usdgAmount,
    usdgAmount,
    BigNumber.from(swapFeeBasisPoints),
    BigNumber.from(taxBasisPoints),
    false,
    usdgSupply,
    BigNumber.from(totalTokenWeights)
  )
  const feeBasisPoints = feeBasisPoints0 > feeBasisPoints1 ? feeBasisPoints0 : feeBasisPoints1

  return {
    amount: adjustDecimals(toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR)),
    feeBasisPoints
  }
}

export const checkTradePathLiquidiytInternal = async (
  provider: Provider,
  market: ExtendedMarket,
  getMarketPrice: any,
  order: Order
): Promise<ViewError> => {
  const data = await Promise.all([
    useInfoTokens(provider, ARBITRUM, false, undefined, undefined),
    getMarketPrice(market)
  ])

  const { infoTokens } = data[0]
  const marketPrice = BigNumber.from(data[1].value)

  let collateralTokenInfo = getTokenInfo(infoTokens, order.inputCollateral.address)
  let toTokenInfo = getTokenInfo(infoTokens, market.marketToken!.address)

  const toTokenAmount = order.sizeDelta
    .mul(BigNumber.from(10).pow(market.marketToken!.decimals))
    .div(order.type == 'MARKET_INCREASE' ? marketPrice : order.trigger!.triggerPrice!)

  const toUsdMax = getUsd(
    toTokenAmount,
    market.marketToken!.address,
    true,
    infoTokens,
    order.type == 'MARKET_INCREASE' ? MARKET : LIMIT,
    order.trigger!.triggerPrice!
  )

  let isNotEnoughReceiveTokenLiquidity = false
  let isCollateralPoolCapacityExceeded = false

  // Check swap limits (max in / max out)
  if (toTokenInfo && toTokenAmount && shouldSwap(collateralTokenInfo, toTokenInfo)) {
    isNotEnoughReceiveTokenLiquidity =
      toTokenInfo.availableAmount!.lt(toTokenAmount) ||
      toTokenInfo.bufferAmount!.gt(toTokenInfo.poolAmount!.sub(toTokenAmount))

    if (
      collateralTokenInfo.maxUsdgAmount &&
      collateralTokenInfo.maxUsdgAmount.gt(0) &&
      collateralTokenInfo.usdgAmount &&
      collateralTokenInfo.maxPrice &&
      toUsdMax
    ) {
      const usdgFromAmount = adjustForDecimals(toUsdMax, USD_DECIMALS, USDG_DECIMALS)
      const nextUsdgAmount = collateralTokenInfo.usdgAmount.add(usdgFromAmount)

      if (nextUsdgAmount.gt(collateralTokenInfo.maxUsdgAmount)) {
        isCollateralPoolCapacityExceeded = true
      }
    }
  }

  let isError = isNotEnoughReceiveTokenLiquidity || isCollateralPoolCapacityExceeded

  return {
    isError: isError,
    message: isError ? 'Insufficient Liquidity for Collateral Swap' : ''
  }
}

export const getTradePreviewInternal = async (
  user: string,
  provider: Provider,
  market: ExtendedMarket,
  convertToToken: any,
  order: Order,
  executionFee: BigNumber,
  existingPosition: ExtendedPosition | undefined,
  opts?: ApiOpts
): Promise<ExtendedPosition> => {
  const usdgToken = IERC20__factory.connect(USDG_ADDRESS, provider)

  const sTimeUS = getStaleTime(CACHE_SECOND * 5, opts)
  const usdgSupplyPromise = cacheFetch({
    key: [GMXV1_CACHE_PREFIX, 'usdgSupply'],
    fn: () => usdgToken.totalSupply(),
    staleTime: sTimeUS,
    cacheTime: sTimeUS * CACHE_TIME_MULT,
    opts
  })
  const infoTokensPromise = useInfoTokens(provider, ARBITRUM, false, undefined, undefined, undefined, opts)
  const [usdgSupply, { infoTokens }] = await Promise.all([usdgSupplyPromise, infoTokensPromise])

  const indexTokenInfo = getTokenInfo(infoTokens, market.indexOrIdentifier)
  const marketPrice = indexTokenInfo.maxPrice!

  let leverage: BigNumber | undefined = BigNumber.from(0)
  const fromUsdMin = getUsd(order.inputCollateralAmount, order.inputCollateral.address, false, infoTokens)

  const toTokenAmount = order.sizeDelta
    .mul(BigNumber.from(10).pow(market.marketToken!.decimals))
    .div(order.type == 'MARKET_INCREASE' ? marketPrice : order.trigger!.triggerPrice!)
  const toUsdMax = getUsd(
    toTokenAmount,
    market.marketToken!.address,
    true,
    infoTokens,
    order.type == 'MARKET_INCREASE' ? MARKET : LIMIT,
    order.trigger!.triggerPrice!
  )

  if (fromUsdMin && toUsdMax && fromUsdMin.gt(0)) {
    const fees = toUsdMax.mul(MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR)
    if (fromUsdMin.sub(fees).gt(0)) {
      leverage = toUsdMax.mul(BASIS_POINTS_DIVISOR).div(fromUsdMin.sub(fees))
    }
  }

  if (fromUsdMin && toUsdMax && fromUsdMin.gt(0)) {
    const fees = toUsdMax.mul(MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR)
    if (fromUsdMin.sub(fees).gt(0)) {
      leverage = toUsdMax.mul(BASIS_POINTS_DIVISOR).div(fromUsdMin.sub(fees))
    }
  }

  let { nextAveragePrice, nextDelta, nextHasProfit } = getNextData(
    order.type == 'MARKET_INCREASE',
    marketPrice,
    order.trigger!.triggerPrice!,
    existingPosition,
    existingPosition?.direction == 'LONG',
    toUsdMax!
  )

  let marketCollateralToken = order.direction == 'LONG' ? market.marketToken!.address! : USDC_E_ADDRESS

  let swapFees = BigNumber.from(0)
  const result = getNextToAmount(
    ARBITRUM,
    order.inputCollateralAmount, // collateralTokenAmount in collateral decimals
    order.inputCollateral.address, // Address0 for Eth
    marketCollateralToken, // Address0 for Eth
    infoTokens,
    undefined,
    undefined,
    usdgSupply,
    100001,
    false
  )
  if (result.feeBasisPoints && fromUsdMin) {
    swapFees = fromUsdMin.mul(result.feeBasisPoints).div(BASIS_POINTS_DIVISOR)
  }

  let positionFee = toUsdMax!.mul(MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR)
  let feesUsd = swapFees.add(positionFee)
  const fromUsdMinAfterFees = fromUsdMin?.sub(swapFees ?? 0).sub(positionFee ?? 0) || BigNumber.from(0)

  if (existingPosition) {
    leverage = getLeverage({
      size: existingPosition.size.add(toUsdMax || 0),
      collateral: existingPosition.collateralAfterFee!.add(fromUsdMinAfterFees),
      delta: nextDelta,
      hasProfit: nextHasProfit,
      includeDelta: false
    })
  }

  let executionFees = getUsd(executionFee, getContract(ARBITRUM, 'NATIVE_TOKEN')!, false, infoTokens)
  feesUsd = feesUsd.add(executionFees || BigNumber.from(0))

  const liquidationPrice = getLiquidationPrice({
    isLong: order.direction == 'LONG',
    size: existingPosition ? existingPosition.size.add(toUsdMax || 0) : toUsdMax ?? BigNumber.from(0),
    collateral: existingPosition
      ? existingPosition.collateralAfterFee!.add(fromUsdMinAfterFees)
      : fromUsdMinAfterFees ?? BigNumber.from(0),
    averagePrice: nextAveragePrice ?? BigNumber.from(0)
  })

  const displayLiquidationPrice = liquidationPrice ? liquidationPrice : existingPosition?.liqudationPrice!

  let collateralTokenInfo = getTokenInfo(infoTokens, order.inputCollateral.address)
  let toTokenInfo = getTokenInfo(infoTokens, market.marketToken!.address)

  let isNotEnoughReceiveTokenLiquidity = false
  let isCollateralPoolCapacityExceeded = false

  // Check swap limits (max in / max out)
  if (toTokenInfo && toTokenAmount && shouldSwap(collateralTokenInfo, toTokenInfo)) {
    isNotEnoughReceiveTokenLiquidity =
      toTokenInfo.availableAmount!.lt(toTokenAmount) ||
      toTokenInfo.bufferAmount!.gt(toTokenInfo.poolAmount!.sub(toTokenAmount))

    if (
      collateralTokenInfo.maxUsdgAmount &&
      collateralTokenInfo.maxUsdgAmount.gt(0) &&
      collateralTokenInfo.usdgAmount &&
      collateralTokenInfo.maxPrice &&
      toUsdMax
    ) {
      const usdgFromAmount = adjustForDecimals(toUsdMax, USD_DECIMALS, USDG_DECIMALS)
      const nextUsdgAmount = collateralTokenInfo.usdgAmount.add(usdgFromAmount)

      if (nextUsdgAmount.gt(collateralTokenInfo.maxUsdgAmount)) {
        isCollateralPoolCapacityExceeded = true
      }
    }
  }

  let isNotEnoughAvailableLiq = false
  // check max available liquidity
  const availableLiq = order.direction == 'LONG' ? toTokenInfo.maxAvailableLong : toTokenInfo.maxAvailableShort
  if (availableLiq && toUsdMax && availableLiq.lt(toUsdMax)) {
    isNotEnoughAvailableLiq = true
  }

  let isError = isNotEnoughReceiveTokenLiquidity || isCollateralPoolCapacityExceeded || isNotEnoughAvailableLiq

  return {
    indexOrIdentifier: '',
    leverage: leverage,
    size: existingPosition ? existingPosition.size.add(order.sizeDelta) : order.sizeDelta,
    collateral: existingPosition ? existingPosition.collateral.add(fromUsdMin!) : fromUsdMin!,
    collateralToken:
      order.direction == 'LONG' ? market.marketToken! : convertToToken(getTokenBySymbol(ARBITRUM, 'USDC.e')!),
    averageEntryPrice: nextAveragePrice,
    liqudationPrice: displayLiquidationPrice,
    fee: feesUsd,
    isError: isError,
    error: isError ? 'Insufficient Liquidity for Trade' : '',
    priceImpact: toNumberDecimal(BigNumber.from(0), 8)
  }
}

export const getTradePreviewInternalV1 = async (
  orderData: CreateOrder,
  existingPos: PositionInfo | undefined,
  market: MarketInfo,
  executionFee: BigNumber,
  opts?: ApiOpts | undefined
): Promise<OpenTradePreviewInfo> => {
  const provider = rpc[ARBITRUM]
  const usdgToken = IERC20__factory.connect(USDG_ADDRESS, provider)

  const sTimeUS = getStaleTime(CACHE_SECOND * 5, opts)
  const usdgSupplyPromise = cacheFetch({
    key: [GMXV1_CACHE_PREFIX, 'usdgSupply'],
    fn: () => usdgToken.totalSupply(),
    staleTime: sTimeUS,
    cacheTime: sTimeUS * CACHE_TIME_MULT,
    opts
  })
  const infoTokensPromise = useInfoTokens(provider, ARBITRUM, false, undefined, undefined, undefined, opts)
  const [usdgSupply, { infoTokens }] = await Promise.all([usdgSupplyPromise, infoTokensPromise])

  const indexTokenInfo = getTokenInfo(infoTokens, market.indexToken.address[ARBITRUM]!)
  const marketPrice = indexTokenInfo.maxPrice!

  let leverage: BigNumber | undefined = BigNumber.from(0)
  const fromUsdMin = getUsd(
    getBNFromFN(orderData.marginDelta.amount),
    orderData.collateral.address[ARBITRUM]!,
    false,
    infoTokens
  )

  const toTokenAmount = getBNFromFN(orderData.sizeDelta.amount)
    .mul(BigNumber.from(10).pow(market.indexToken!.decimals))
    .div(orderData.type === 'MARKET' ? marketPrice : getBNFromFN(orderData.triggerData!.triggerPrice!))
  const toUsdMax = getUsd(
    toTokenAmount,
    market.indexToken.address[ARBITRUM]!,
    true,
    infoTokens,
    orderData.type == 'MARKET' ? MARKET : LIMIT,
    getBNFromFN(orderData.triggerData!.triggerPrice!)
  )

  if (fromUsdMin && toUsdMax && fromUsdMin.gt(0)) {
    const fees = toUsdMax.mul(MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR)
    if (fromUsdMin.sub(fees).gt(0)) {
      leverage = toUsdMax.mul(BASIS_POINTS_DIVISOR).div(fromUsdMin.sub(fees))
    }
  }

  if (fromUsdMin && toUsdMax && fromUsdMin.gt(0)) {
    const fees = toUsdMax.mul(MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR)
    if (fromUsdMin.sub(fees).gt(0)) {
      leverage = toUsdMax.mul(BASIS_POINTS_DIVISOR).div(fromUsdMin.sub(fees))
    }
  }

  let { nextAveragePrice, nextDelta, nextHasProfit } = getNextData(
    orderData.type == 'MARKET',
    marketPrice,
    getBNFromFN(orderData.triggerData!.triggerPrice!),
    existingPos?.metadata as ExtendedPosition,
    existingPos?.direction == 'LONG',
    toUsdMax!
  )

  let marketCollateralToken = orderData.direction == 'LONG' ? market.indexToken.address[ARBITRUM]! : USDC_E_ADDRESS

  let swapFees = BigNumber.from(0)
  const result = getNextToAmount(
    ARBITRUM,
    getBNFromFN(orderData.marginDelta.amount), // collateralTokenAmount in collateral decimals
    orderData.collateral.address[ARBITRUM]!, // Address0 for Eth
    marketCollateralToken, // Address0 for Eth
    infoTokens,
    undefined,
    undefined,
    usdgSupply,
    100001,
    false
  )
  if (result.feeBasisPoints && fromUsdMin) {
    swapFees = fromUsdMin.mul(result.feeBasisPoints).div(BASIS_POINTS_DIVISOR)
  }

  let positionFee = toUsdMax!.mul(MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR)
  let feesUsd = swapFees.add(positionFee)
  const fromUsdMinAfterFees = fromUsdMin?.sub(swapFees ?? 0).sub(positionFee ?? 0) || BigNumber.from(0)
  const internalPos = existingPos?.metadata

  if (existingPos) {
    leverage = getLeverage({
      size: internalPos.size.add(toUsdMax || 0),
      collateral: internalPos.collateralAfterFee!.add(fromUsdMinAfterFees),
      delta: nextDelta,
      hasProfit: nextHasProfit,
      includeDelta: false
    })
  }

  let executionFees = getUsd(executionFee, getContract(ARBITRUM, 'NATIVE_TOKEN')!, false, infoTokens)
  feesUsd = feesUsd.add(executionFees || BigNumber.from(0))

  const liquidationPrice = getLiquidationPrice({
    isLong: orderData.direction == 'LONG',
    size: existingPos ? internalPos.size.add(toUsdMax || 0) : toUsdMax ?? BigNumber.from(0),
    collateral: existingPos
      ? internalPos.collateralAfterFee!.add(fromUsdMinAfterFees)
      : fromUsdMinAfterFees ?? BigNumber.from(0),
    averagePrice: nextAveragePrice ?? BigNumber.from(0)
  })

  const displayLiquidationPrice = liquidationPrice ? liquidationPrice : existingPos?.metadata?.liqudationPrice!

  let collateralTokenInfo = getTokenInfo(infoTokens, orderData.collateral.address[ARBITRUM]!)
  let toTokenInfo = getTokenInfo(infoTokens, market.indexToken.address[ARBITRUM]!)

  let isNotEnoughReceiveTokenLiquidity = false
  let isCollateralPoolCapacityExceeded = false

  // Check swap limits (max in / max out)
  if (toTokenInfo && toTokenAmount && shouldSwap(collateralTokenInfo, toTokenInfo)) {
    isNotEnoughReceiveTokenLiquidity =
      toTokenInfo.availableAmount!.lt(toTokenAmount) ||
      toTokenInfo.bufferAmount!.gt(toTokenInfo.poolAmount!.sub(toTokenAmount))

    if (
      collateralTokenInfo.maxUsdgAmount &&
      collateralTokenInfo.maxUsdgAmount.gt(0) &&
      collateralTokenInfo.usdgAmount &&
      collateralTokenInfo.maxPrice &&
      toUsdMax
    ) {
      const usdgFromAmount = adjustForDecimals(toUsdMax, USD_DECIMALS, USDG_DECIMALS)
      const nextUsdgAmount = collateralTokenInfo.usdgAmount.add(usdgFromAmount)

      if (nextUsdgAmount.gt(collateralTokenInfo.maxUsdgAmount)) {
        isCollateralPoolCapacityExceeded = true
      }
    }
  }

  let isNotEnoughAvailableLiq = false
  // check max available liquidity
  const availableLiq = orderData.direction == 'LONG' ? toTokenInfo.maxAvailableLong : toTokenInfo.maxAvailableShort
  if (availableLiq && toUsdMax && availableLiq.lt(toUsdMax)) {
    isNotEnoughAvailableLiq = true
  }

  let isError = isNotEnoughReceiveTokenLiquidity || isCollateralPoolCapacityExceeded || isNotEnoughAvailableLiq

  return {
    marketId: orderData.marketId,
    collateral: orderData.collateral,
    leverage: leverage ? FixedNumber.fromValue(leverage.toString(), 4, 4) : FixedNumber.fromString('0'),
    size: existingPos
      ? toAmountInfo(internalPos.size.add(getBNFromFN(orderData.sizeDelta.amount)), 30, false)
      : toAmountInfo(getBNFromFN(orderData.sizeDelta.amount), 30, false),
    margin: existingPos
      ? toAmountInfo(internalPos.collateral.add(fromUsdMin!), 30, false)
      : toAmountInfo(fromUsdMin!, 30, false),
    avgEntryPrice: FixedNumber.fromValue(nextAveragePrice.toString(), 30, 30),
    liqudationPrice: FixedNumber.fromValue(displayLiquidationPrice.toString(), 30, 30),
    fee: FixedNumber.fromValue(feesUsd.toString(), 30, 30),
    priceImpact: FixedNumber.fromValue('0', 30, 30),
    isError: isError,
    errMsg: isError ? 'Insufficient Liquidity for Trade' : ''
  }
}
