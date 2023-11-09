export function decodeMarketId(marketId: string) {
  const [chainId, protocolId, protocolMarketId] = marketId.split('-')
  return {
    chainId,
    protocolId,
    protocolMarketId
  }
}

export function encodeMarketId(chainId: string, protocolId: string, protocolMarketId: string) {
  return `${chainId}-${protocolId}-${protocolMarketId}`
}
