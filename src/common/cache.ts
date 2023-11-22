import { QueryClient } from '@tanstack/react-query'
import { ApiOpts } from '../interfaces/V1/IRouterAdapterBaseV1'

export const CACHE_SECOND = 1000
export const CACHE_MINUTE = 60 * CACHE_SECOND
export const CACHE_HOUR = 60 * CACHE_MINUTE
export const CACHE_DAY = 24 * CACHE_HOUR
export const CACHE_WEEK = 7 * CACHE_DAY
export const CACHE_TIME_MULT = 2

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

export type CacheFetchArgs = {
  key: unknown[]
  fn: () => Promise<any>
  staleTime: number
  cacheTime: number
  opts?: ApiOpts
}

export async function cacheFetch(args: CacheFetchArgs) {
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
        queryClient.refetchQueries({ queryKey: args.key, exact: true })
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
