import { ApiOpts } from '../../interfaces/V1/IRouterAdapterBaseV1'
import { AEVO_CACHE_PREFIX, cacheFetch } from '../../common/cache'
import { aevoUpdateTokensMap } from './config'
import { PrivateApiService, PublicApiService } from '../../../generated/aevo'

export async function aevoCacheGetAllAssets(
  publicApi: PublicApiService,
  staleTime: number,
  cacheTime: number,
  opts?: ApiOpts
) {
  return await cacheFetch({
    key: [AEVO_CACHE_PREFIX, 'allassets'],
    fn: () => publicApi.getAssets(),
    staleTime: staleTime,
    cacheTime: cacheTime,
    opts
  })
}

export async function aevoCacheGetAllMarkets(
  publicApi: PublicApiService,
  staleTime: number,
  cacheTime: number,
  opts?: ApiOpts
) {
  const allMarkets = await cacheFetch({
    key: [AEVO_CACHE_PREFIX, 'allmarkets'],
    fn: () => publicApi.getMarkets(undefined, 'PERPETUAL'),
    staleTime: staleTime,
    cacheTime: cacheTime,
    opts
  })

  // aevo update tokens map
  aevoUpdateTokensMap(allMarkets)

  return allMarkets
}

export async function aevoCacheGetCoingeckoStats(
  publicApi: PublicApiService,
  staleTime: number,
  cacheTime: number,
  opts?: ApiOpts
) {
  return await cacheFetch({
    key: [AEVO_CACHE_PREFIX, 'coingeckoStats'],
    fn: () => publicApi.getCoingeckoStatistics(),
    staleTime: staleTime,
    cacheTime: cacheTime
  })
}

export async function aevoCacheGetOrderbook(
  asset: string,
  publicApi: PublicApiService,
  staleTime: number,
  cacheTime: number,
  opts?: ApiOpts
) {
  return await cacheFetch({
    key: [AEVO_CACHE_PREFIX, 'orderbook', asset],
    fn: () => publicApi.getOrderbook(`${asset}-PERP`),
    staleTime: staleTime,
    cacheTime: cacheTime,
    opts
  })
}

export async function aevoCacheGetAccount(
  privateApi: PrivateApiService,
  staleTime: number,
  cacheTime: number,
  opts?: ApiOpts
) {
  return await cacheFetch({
    key: [AEVO_CACHE_PREFIX, 'account'],
    fn: () => privateApi.getAccount(),
    staleTime: staleTime,
    cacheTime: cacheTime,
    opts
  })
}

type TradeHistoryReturnType = Awaited<ReturnType<PrivateApiService['getTradeHistory']>>

export async function aevoCacheGetTradeHistory(
  privateApi: PrivateApiService,
  staleTime: number,
  cacheTime: number,
  opts?: ApiOpts
): Promise<TradeHistoryReturnType> {
  const limitStep = 1000
  let offset = 0
  let tradeHistory: NonNullable<TradeHistoryReturnType['trade_history']> = []
  let totalCount = 0

  // since the max limit is 1000 repeateadly fetch the trade history until no more history is returned
  do {
    const tradeHistoryPart = await cacheFetch({
      key: [AEVO_CACHE_PREFIX, 'tradesHistory', offset],
      fn: () =>
        privateApi.getTradeHistory(
          0,
          undefined,
          undefined,
          ['trade', 'liquidation'],
          'PERPETUAL',
          undefined,
          limitStep,
          false,
          offset,
          'created_timestamp',
          'DESC'
        ),
      staleTime: staleTime,
      cacheTime: cacheTime,
      opts
    })

    if (tradeHistoryPart.trade_history && tradeHistoryPart.trade_history.length === limitStep) {
      tradeHistory = tradeHistory.concat(tradeHistoryPart.trade_history)
      offset += limitStep
      totalCount += limitStep
    } else {
      tradeHistory = tradeHistory.concat(tradeHistoryPart.trade_history || [])
      totalCount += tradeHistoryPart.trade_history?.length || 0
      break
    }
  } while (true)

  return {
    trade_history: tradeHistory,
    count: String(totalCount)
  }
}

type TransactionHistoryReturnType = Awaited<ReturnType<PrivateApiService['getTransactionHistory']>>

export async function aevoCacheGetPendingWithdraw(
  privateApi: PrivateApiService,
  staleTime: number,
  cacheTime: number,
  opts?: ApiOpts
): Promise<TransactionHistoryReturnType> {
  return await cacheFetch({
    key: [AEVO_CACHE_PREFIX, 'pendingwithdraw'],
    fn: () =>
      privateApi.getTransactionHistory(
        undefined,
        undefined,
        'withdraw',
        'initiated',
        1000,
        0,
        'initiated_timestamp',
        'DESC'
      ),
    staleTime: staleTime,
    cacheTime: cacheTime,
    opts
  })
}
