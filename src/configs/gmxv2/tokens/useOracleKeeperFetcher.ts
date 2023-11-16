export type TickersResponse = {
  minPrice: string
  maxPrice: string
  oracleDecimals: number
  tokenSymbol: string
  tokenAddress: string
  updatedAt: number
}[]

export type DayPriceCandle = {
  tokenSymbol: string
  high: number
  low: number
  open: number
  close: number
}

export type OracleKeeperFetcher = ReturnType<typeof useOracleKeeperFetcher>

let fallbackThrottleTimerId: any

export function useOracleKeeperFetcher(chainId: number) {
  const oracleKeeperUrl = 'https://arbitrum-api.gmxinfra.io'

  async function fetchTickers(): Promise<TickersResponse> {
    try {
      const res = await fetch(oracleKeeperUrl! + '/prices/tickers')
      const res_1 = await res.json()
      if (!res_1.length) {
        throw new Error('Invalid tickers response')
      }
      return res_1
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)

      throw e
    }
  }

  async function fetch24hPrices(): Promise<DayPriceCandle[]> {
    try {
      const res = await fetch(oracleKeeperUrl! + '/prices/24h')
      const res_1 = await res.json()
      if (!res_1?.length) {
        throw new Error('Invalid 24h prices response')
      }
      return res_1
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
      throw e
    }
  }

  return {
    oracleKeeperUrl,
    fetchTickers,
    fetch24hPrices
  }
}
