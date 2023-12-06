import DataStore from '../abis/DataStore.json'
import { getContract } from '../config/contracts'
import { MIN_COLLATERAL_USD_KEY, MIN_POSITION_SIZE_USD_KEY } from '../config/dataStore'
import { BigNumber } from 'ethers'
import { useMulticall } from '../lib/multicall/useMulticall'
import { CACHE_DAY, CACHE_TIME_MULT, cacheFetch, getStaleTime, GMXV2_CACHE_PREFIX } from '../../../common/cache'
import { ApiOpts } from '../../../interfaces/V1/IRouterAdapterBaseV1'

export type PositionsConstantsResult = {
  minCollateralUsd?: BigNumber
  minPositionSizeUsd?: BigNumber
}

export async function usePositionsConstants(chainId: number, opts?: ApiOpts): Promise<PositionsConstantsResult> {
  const sTime = getStaleTime(CACHE_DAY, opts)
  const { data } = await cacheFetch({
    key: [GMXV2_CACHE_PREFIX, 'usePositionsConstants', chainId],
    fn: () =>
      useMulticall(chainId, 'usePositionsConstants', {
        key: [],

        refreshInterval: 60000,

        request: {
          dataStore: {
            contractAddress: getContract(chainId, 'DataStore'),
            abi: DataStore.abi,
            calls: {
              minCollateralUsd: {
                methodName: 'getUint',
                params: [MIN_COLLATERAL_USD_KEY]
              },
              minPositionSizeUsd: {
                methodName: 'getUint',
                params: [MIN_POSITION_SIZE_USD_KEY]
              }
            }
          }
        },
        parseResponse: (res) => {
          return {
            minCollateralUsd: BigNumber.from(res.data.dataStore.minCollateralUsd.returnValues[0]),
            minPositionSizeUsd: BigNumber.from(res.data.dataStore.minPositionSizeUsd.returnValues[0])
          }
        }
      }),
    staleTime: sTime,
    cacheTime: sTime * CACHE_TIME_MULT,
    opts
  })

  return data || {}
}
