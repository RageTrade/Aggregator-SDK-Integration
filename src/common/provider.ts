import { providers } from 'ethers'

export const rpc: Record<number, providers.StaticJsonRpcProvider> = {
  10: new providers.StaticJsonRpcProvider(
    'https://optimism.blockpi.network/v1/rpc/eaa4a202e9992d4a8f25d1725b52236e3587cd44'
  ),
  42161: new providers.StaticJsonRpcProvider(
    'https://arbitrum.blockpi.network/v1/rpc/3fccabab81b09aeff58df1caaea8f27c70346335'
  )
}
