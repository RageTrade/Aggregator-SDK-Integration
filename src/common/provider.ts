import { providers } from 'ethers'

export const rpc: Record<number, providers.StaticJsonRpcProvider> = {
  10: new providers.StaticJsonRpcProvider('https://optimism.blockpi.network/v1/rpc/public'),
  42161: new providers.StaticJsonRpcProvider('https://arbitrum.blockpi.network/v1/rpc/public')
}
