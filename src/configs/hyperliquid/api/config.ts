export const HL_BASE_URL = 'https://api.hyperliquid.xyz'
export const HL_INFO_URL = `${HL_BASE_URL}/info`
export const HL_EXCHANGE_URL = `${HL_BASE_URL}/exchange`

import { defineChain } from 'viem'

export const hyperliquid = defineChain({
  id: 9999998,
  name: 'Hyperliquid',
  network: 'hyperliquid',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH'
  },
  rpcUrls: {
    default: {
      http: ['https://app.hyperliquid.xyz/explorer'],
      webSocket: ['https://app.hyperliquid.xyz/explorer']
    },
    public: {
      http: ['https://app.hyperliquid.xyz/explorer'],
      webSocket: ['https://app.hyperliquid.xyz/explorer']
    }
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://app.hyperliquid.xyz/explorer' }
  }
})
