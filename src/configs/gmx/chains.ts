import { BigNumber, ethers } from 'ethers'

const { parseEther } = ethers.utils

export const ETH_MAINNET = 1
export const AVALANCHE = 43114
export const AVALANCHE_FUJI = 43113
export const ARBITRUM = 42161
export const ARBITRUM_GOERLI = 421613
export const ARBITRUM_TESTNET = 421611
export const FEES_HIGH_BPS = 50

export const DEFAULT_CHAIN_ID = ARBITRUM
export const CHAIN_ID = DEFAULT_CHAIN_ID

export const SUPPORTED_CHAIN_IDS = [ARBITRUM, AVALANCHE]

SUPPORTED_CHAIN_IDS.push(ARBITRUM_TESTNET, AVALANCHE_FUJI)

export const IS_NETWORK_DISABLED = {
  [ARBITRUM]: false,
  [AVALANCHE]: false
}

export const CHAIN_NAMES_MAP = {
  [ARBITRUM_TESTNET]: 'ArbRinkeby',
  [ARBITRUM]: 'Arbitrum',
  [AVALANCHE]: 'Avalanche',
  [AVALANCHE_FUJI]: 'Avalanche Fuji'
}

export const GAS_PRICE_ADJUSTMENT_MAP = {
  [ARBITRUM]: '0',
  [AVALANCHE]: '3000000000' // 3 gwei
}

export const MAX_GAS_PRICE_MAP = {
  [AVALANCHE]: '200000000000' // 200 gwei
}

export const HIGH_EXECUTION_FEES_MAP = {
  [ARBITRUM]: 3, // 3 USD
  [AVALANCHE]: 3 // 3 USD
}

export type NetworkConstant = {
  nativeTokenSymbol: string
  defaultCollateralSymbol: string
  defaultFlagOrdersEnabled: boolean
  positionReaderPropsLength: number
  v2: boolean
  wrappedTokenSymbol?: string

  SWAP_ORDER_EXECUTION_GAS_FEE: BigNumber
  INCREASE_ORDER_EXECUTION_GAS_FEE: BigNumber
  // contract requires that execution fee be strictly greater than instead of gte
  DECREASE_ORDER_EXECUTION_GAS_FEE: BigNumber
}

const constants: { [chainId: number]: NetworkConstant } = {
  [ARBITRUM_TESTNET]: {
    nativeTokenSymbol: 'ETH',
    defaultCollateralSymbol: 'USDC',
    defaultFlagOrdersEnabled: false,
    positionReaderPropsLength: 9,
    v2: true,

    SWAP_ORDER_EXECUTION_GAS_FEE: parseEther('0.0003'),
    INCREASE_ORDER_EXECUTION_GAS_FEE: parseEther('0.0003'),
    // contract requires that execution fee be strictly greater than instead of gte
    DECREASE_ORDER_EXECUTION_GAS_FEE: parseEther('0.000300001')
  },

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
  },

  [AVALANCHE_FUJI]: {
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

const ALCHEMY_WHITELISTED_DOMAINS = ['gmx.io', 'app.gmx.io']

export const RPC_PROVIDERS = {
  [ARBITRUM]: getDefaultArbitrumRpcUrl(),
  [ARBITRUM_TESTNET]: 'https://rinkeby.arbitrum.io/rpc',
  [AVALANCHE]: 'https://api.avax.network/ext/bc/C/rpc',
  [AVALANCHE_FUJI]: 'https://api.avax-test.network/ext/bc/C/rpc'
}

export const FALLBACK_PROVIDERS = {
  [ARBITRUM]: [getAlchemyHttpUrl()],
  [AVALANCHE]: ['https://avax-mainnet.gateway.pokt.network/v1/lb/626f37766c499d003aada23b']
}

export type NetworkMetadata = {
  chainId: string
  chainName: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  rpcUrls: string
  blockExplorerUrls: string[]
}

export const NETWORK_METADATA: { [chainId: number]: NetworkMetadata } = {
  [ARBITRUM_TESTNET]: {
    chainId: '0x' + ARBITRUM_TESTNET.toString(16),
    chainName: 'Arbitrum Testnet',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: RPC_PROVIDERS[ARBITRUM_TESTNET],
    blockExplorerUrls: ['https://rinkeby-explorer.arbitrum.io/']
  },
  [ARBITRUM]: {
    chainId: '0x' + ARBITRUM.toString(16),
    chainName: 'Arbitrum',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: RPC_PROVIDERS[ARBITRUM],
    blockExplorerUrls: [getExplorerUrl(ARBITRUM)]
  },
  [AVALANCHE]: {
    chainId: '0x' + AVALANCHE.toString(16),
    chainName: 'Avalanche',
    nativeCurrency: {
      name: 'AVAX',
      symbol: 'AVAX',
      decimals: 18
    },
    rpcUrls: RPC_PROVIDERS[AVALANCHE],
    blockExplorerUrls: [getExplorerUrl(AVALANCHE)]
  },
  [AVALANCHE_FUJI]: {
    chainId: '0x' + AVALANCHE_FUJI.toString(16),
    chainName: 'Avalanche Fuji',
    nativeCurrency: {
      name: 'AVAX',
      symbol: 'AVAX',
      decimals: 18
    },
    rpcUrls: RPC_PROVIDERS[AVALANCHE_FUJI],
    blockExplorerUrls: [getExplorerUrl(AVALANCHE_FUJI)]
  }
}

export const getConstant = (chainId: number, key: keyof NetworkConstant) => {
  if (!(chainId in constants)) {
    throw new Error(`Unsupported chainId ${chainId}`)
  }

  if (chainId == ARBITRUM_TESTNET) {
    return constants[ARBITRUM_TESTNET][key]
  } else if (chainId == ARBITRUM) {
    return constants[ARBITRUM][key]
  } else if (chainId == AVALANCHE) {
    return constants[AVALANCHE][key]
  } else if (chainId == AVALANCHE_FUJI) {
    return constants[AVALANCHE_FUJI][key]
  }
}

export function getDefaultArbitrumRpcUrl() {
  return 'https://arb1.arbitrum.io/rpc'
}

export function getRpcUrl(chainId: number): string | undefined {
  if (chainId == ARBITRUM_TESTNET) {
    return RPC_PROVIDERS[ARBITRUM_TESTNET]
  } else if (chainId == ARBITRUM) {
    return RPC_PROVIDERS[ARBITRUM]
  } else if (chainId == AVALANCHE) {
    return RPC_PROVIDERS[AVALANCHE]
  } else if (chainId == AVALANCHE_FUJI) {
    return RPC_PROVIDERS[AVALANCHE_FUJI]
  }
}

export function getAlchemyHttpUrl() {
  return 'https://arb-mainnet.g.alchemy.com/v2/EmVYwUw0N2tXOuG0SZfe5Z04rzBsCbr2'
}

export function getAlchemyWsUrl() {
  return 'wss://arb-mainnet.g.alchemy.com/v2/EmVYwUw0N2tXOuG0SZfe5Z04rzBsCbr2'
}

export function getExplorerUrl(chainId: number) {
  if (chainId === 3) {
    return 'https://ropsten.etherscan.io/'
  } else if (chainId === 42) {
    return 'https://kovan.etherscan.io/'
  } else if (chainId === ARBITRUM_TESTNET) {
    return 'https://testnet.arbiscan.io/'
  } else if (chainId === ARBITRUM) {
    return 'https://arbiscan.io/'
  } else if (chainId === AVALANCHE) {
    return 'https://snowtrace.io/'
  } else if (chainId === AVALANCHE_FUJI) {
    return 'https://testnet.snowtrace.io/'
  } else if (chainId === 10) {
    return 'https://optimistic.etherscan.io/'
  }
  return 'https://etherscan.io/'
}

export function getHighExecutionFee(chainId: number) {
  if (chainId == ARBITRUM) {
    return HIGH_EXECUTION_FEES_MAP[ARBITRUM] || 3
  } else if (chainId == AVALANCHE) {
    return HIGH_EXECUTION_FEES_MAP[AVALANCHE] || 3
  }
}

export function isSupportedChain(chainId: number) {
  return SUPPORTED_CHAIN_IDS.includes(chainId)
}
