import { QueryClient } from '@tanstack/react-query'
import { ApiOpts } from '../interfaces/V1/IRouterAdapterBaseV1'

export const CACHE_SECOND = 1000
export const CACHE_MINUTE = 60 * CACHE_SECOND
export const CACHE_HOUR = 60 * CACHE_MINUTE
export const CACHE_DAY = 24 * CACHE_HOUR
export const CACHE_WEEK = 7 * CACHE_DAY
export const CACHE_TIME_MULT = 2

export const GMX_COMMON_CACHE_PREFIX = 'gmx'
export const GMXV2_CACHE_PREFIX = 'gmxv2'
export const GMXV1_CACHE_PREFIX = 'gmxv1'
export const SYNV2_CACHE_PREFIX = 'synv2'
export const HL_CACHE_PREFIX = 'hl'
export const AEVO_CACHE_PREFIX = 'aevo'
export const PERENNIAL_CACHE_PREFIX = 'perennial'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity
    }
  }
})

export function getStaleTime(time: number, opts?: ApiOpts): number {
  if (opts?.bypassCache) {
    return 0
  }

  if (opts?.overrideStaleTime) {
    return opts.overrideStaleTime
  }

  return time
}

export type CacheFetchArgs<T> = {
  key: unknown[]
  fn: (args?: unknown) => Promise<T>
  staleTime: number
  cacheTime: number
  opts?: ApiOpts
}

export async function cacheFetch<T>(args: CacheFetchArgs<T>): Promise<T> {
  const qs = queryClient.getQueryState(args.key)

  if (qs) {
    const currentTS = Date.now()
    const lastUpdatedAt = qs.dataUpdatedAt
    const timeDiff = currentTS - lastUpdatedAt
    // console.log('cacheFetch timeDiff: ', timeDiff)

    // cacheTime cannot be less than staleTime
    args.cacheTime = args.cacheTime < args.staleTime ? args.staleTime : args.cacheTime

    if (timeDiff <= args.staleTime) {
      // console.log('cacheFetch: timeDiff <= args.staleTime')
      // if the data is fresh, return it
      return queryClient.ensureQueryData({ queryKey: args.key, queryFn: args.fn })
    }

    if (timeDiff <= args.cacheTime) {
      // console.log('cacheFetch: timeDiff <= args.cacheTime')
      // if the data is stale, but not yet expired refetch it in the background and return the cached data
      if (qs.data != undefined) {
        // console.log('cacheFetch: refetching query')
        // cancelRefetch - When set to false, no refetch will be made if there is already a request running.
        queryClient.refetchQueries({ queryKey: args.key, exact: true }, { cancelRefetch: false })
      }

      // console.log('cacheFetch: returning ensureQueryData')
      // return the data from cache or fetch if this the first time
      return queryClient.ensureQueryData({ queryKey: args.key, queryFn: args.fn })
    }
  }

  // console.log('cacheFetch: returning fetchQuery')
  // data is expired/unavailable, refetch
  return queryClient.fetchQuery({
    queryKey: args.key,
    queryFn: args.fn,
    staleTime: getStaleTime(args.staleTime, args.opts)
  })
}

export function getCachedValueByKey<T>(key: CacheFetchArgs<T>['key']) {
  return queryClient.getQueryData(key) as T
}
