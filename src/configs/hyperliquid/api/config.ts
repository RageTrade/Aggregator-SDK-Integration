export const HL_BASE_URL = 'https://api.hyperliquid.xyz'
export const HL_INFO_URL = `${HL_BASE_URL}/info`
export const HL_EXCHANGE_URL = `${HL_BASE_URL}/exchange`
export const HL_WSS_URL = 'wss://api.hyperliquid.xyz/ws'

import { defineChain } from 'viem'
import { arbitrum } from 'viem/chains'

// export const hyperliquid = defineChain({
//   id: 9999998,
//   name: 'Hyperliquid',
//   network: 'hyperliquid',
//   nativeCurrency: {
//     decimals: 18,
//     name: 'Ether',
//     symbol: 'ETH'
//   },
//   rpcUrls: {
//     default: {
//       http: ['https://app.hyperliquid.xyz/explorer'],
//       webSocket: ['https://app.hyperliquid.xyz/explorer']
//     },
//     public: {
//       http: ['https://app.hyperliquid.xyz/explorer'],
//       webSocket: ['https://app.hyperliquid.xyz/explorer']
//     }
//   },
//   blockExplorers: {
//     default: { name: 'Explorer', url: 'https://app.hyperliquid.xyz/explorer' }
//   }
// })

export const hyperliquid = arbitrum

export const HL_TAKER_FEE_BPS = '0.00024'
export const HL_MAKER_FEE_BPS = '-0.00002'
