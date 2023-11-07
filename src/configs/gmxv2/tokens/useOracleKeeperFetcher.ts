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

  function fetchTickers(): Promise<TickersResponse> {
    return fetch(oracleKeeperUrl! + '/prices/tickers')
      .then((res) => res.json())
      .then((res) => {
        if (!res.length) {
          throw new Error('Invalid tickers response')
        }

        return res
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e)

        throw e
      })
  }

  function fetch24hPrices(): Promise<DayPriceCandle[]> {
    return fetch(oracleKeeperUrl! + '/prices/24h')
      .then((res) => res.json())
      .then((res) => {
        if (!res?.length) {
          throw new Error('Invalid 24h prices response')
        }

        return res
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e)
        throw e
      })
  }

  return {
    oracleKeeperUrl,
    fetchTickers,
    fetch24hPrices
  }
}
