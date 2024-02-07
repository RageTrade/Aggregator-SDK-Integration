export function aevoMarketIdToAsset(marketId: string): string {
  return marketId.split('-')[2]
}
