import { providers } from 'ethers'

export const rpc: Record<number, providers.StaticJsonRpcProvider> = {
  10: new providers.StaticJsonRpcProvider('https://mainnet.optimism.io'),
  42161: new providers.StaticJsonRpcProvider('https://arb1.arbitrum.io/rpc')
}
