import { providers } from 'ethers'

export const rpc: Record<number, providers.StaticJsonRpcProvider> = {
  10: new providers.StaticJsonRpcProvider('https://optimism.blockpi.network/v1/rpc/e9eb838be05076b18bceb9e7efe3797c93bed264'),
  42161: new providers.StaticJsonRpcProvider('https://arbitrum.blockpi.network/v1/rpc/6bee49eb5c39a712464e8f39182ff12127c84f48')
}
