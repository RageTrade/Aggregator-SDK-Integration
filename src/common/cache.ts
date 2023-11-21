import { QueryClient } from '@tanstack/react-query'
import { ApiOpts } from '../interfaces/V1/IRouterAdapterBaseV1'

export const CACHE_SECOND = 1000
export const CACHE_MINUTE = 60 * CACHE_SECOND
export const CACHE_HOUR = 60 * CACHE_MINUTE
export const CACHE_DAY = 24 * CACHE_HOUR
export const CACHE_WEEK = 7 * CACHE_DAY

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

export default queryClient
