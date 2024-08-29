export function reyaMarketIdToAsset(marketId: string): string {
  return marketId.split('-')[2]
}
