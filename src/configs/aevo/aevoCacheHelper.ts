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
