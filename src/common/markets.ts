function decodeMarketId(marketId: string) {
  const [chainId, protocolId, protocolMarketId] = marketId.split('-')
  return {
    chainId,
    protocolId,
    protocolMarketId
  }
}
function encodeMarketId(chainId: string, protocolId: string, protocolMarketId: string) {
  return `${chainId}-${protocolId}-${protocolMarketId}`
}
