import { defineChain } from 'viem'
import { Token } from '../../common/tokens'

// TODO might not be needed. Users don't interact with our chain
export const orderly = defineChain({
  id: 291,
  name: 'Orderly',
  network: 'orderly',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH'
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.orderly.network'],
      webSocket: ['https://rpc.orderly.network']
    },
    public: {
      http: ['https://rpc.orderly.network'],
      webSocket: ['https://rpc.orderly.network']
    }
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.orderly.network/' }
  }
})

export const ORDERLY_COLLATERAL_TOKEN = {
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  address: {
    42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    10: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607'
  }
} as Token
