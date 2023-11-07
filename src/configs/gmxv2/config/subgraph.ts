import { ARBITRUM, ARBITRUM_GOERLI, AVALANCHE, AVALANCHE_FUJI, ETH_MAINNET } from '../../gmx/chains'

const SUBGRAPH_URLS = {
  [ARBITRUM]: {
    stats: 'https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-arbitrum-stats/api',
    referrals: 'https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-arbitrum-referrals/api',
    nissohVault: 'https://api.thegraph.com/subgraphs/name/nissoh/gmx-vault',
    syntheticsStats: 'https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-arbitrum-stats/api'
  },

  [ARBITRUM_GOERLI]: {
    stats: 'https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-arbitrum-stats/api',
    referrals: 'https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-goerli-referrals/api',
    syntheticsStats: 'https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-goerli-stats/api'
  },

  [AVALANCHE]: {
    stats: 'https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-avalanche-stats/api',
    referrals: 'https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-avalanche-referrals/api',
    syntheticsStats: 'https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-avalanche-stats/api'
  },

  [AVALANCHE_FUJI]: {
    stats: 'https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-stats',
    referrals: 'https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-fuji-referrals/api',
    syntheticsStats: 'https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-fuji-stats/api'
  },

  common: {
    [ETH_MAINNET]: {
      chainLink: 'https://api.thegraph.com/subgraphs/name/deividask/chainlink'
    }
  }
}

export function getSubgraphUrl(chainId: number, subgraph: string) {
  console.log('getSubgraphUrl', chainId, subgraph)
  return SUBGRAPH_URLS?.[chainId]?.[subgraph]
}
