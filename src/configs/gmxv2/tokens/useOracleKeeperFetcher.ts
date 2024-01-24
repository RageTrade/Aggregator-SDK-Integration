import { CACHE_TIME_MULT, cacheFetch, getStaleTime, GMXV2_CACHE_PREFIX, CACHE_SECOND } from '../../../common/cache'
import { ApiOpts } from '../../../interfaces/V1/IRouterAdapterBaseV1'
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

export function useOracleKeeperFetcher(chainId: number, opts?: ApiOpts) {
  const oracleKeeperUrl = 'https://arbitrum-api.gmxinfra.io'

  async function fetchTickers(): Promise<TickersResponse> {
    try {
      const sTimeOP = getStaleTime(CACHE_SECOND * 2, opts)
      const res = await cacheFetch({
        key: [GMXV2_CACHE_PREFIX, 'oraclePrices'],
        fn: () => fetch(oracleKeeperUrl! + '/prices/tickers').then((res) => res.json()),
        staleTime: sTimeOP,
        cacheTime: sTimeOP * CACHE_TIME_MULT,
        opts
      })

      if (!res.length) {
        throw new Error('Invalid tickers response')
      }
      return res
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
