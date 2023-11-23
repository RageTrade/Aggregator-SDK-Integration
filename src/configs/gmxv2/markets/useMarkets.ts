import SyntheticsReader from '../abis/SyntheticsReader.json'
import { getContract } from '../config/contracts'
import { convertTokenAddress, getToken } from '../config/tokens'
import { ethers } from 'ethers'
import { MarketsData } from './types'
import { getMarketFullName } from './utils'
import { useMulticall } from '../lib/multicall/useMulticall'
import { CACHE_DAY, CACHE_TIME_MULT, GMXV2_CACHE_PREFIX, cacheFetch, getStaleTime } from '../../../common/cache'
import { ApiOpts } from '../../../interfaces/V1/IRouterAdapterBaseV1'

type MarketsResult = {
  marketsData?: MarketsData
  marketsAddresses?: string[]
}

const MARKETS_COUNT = 100

export async function useMarkets(chainId: number, opts?: ApiOpts): Promise<MarketsResult> {
  const sTime = getStaleTime(CACHE_DAY, opts)
  const { data } = await cacheFetch({
    key: [GMXV2_CACHE_PREFIX, 'useMulticall', 'useMarkets', chainId],
    fn: () =>
      useMulticall(chainId, 'useMarketsData', {
        key: [],

        refreshInterval: 60000,

        request: () => ({
          reader: {
            contractAddress: getContract(chainId, 'SyntheticsReader'),
            abi: SyntheticsReader.abi,
            calls: {
              markets: {
                methodName: 'getMarkets',
                params: [getContract(chainId, 'DataStore'), 0, MARKETS_COUNT]
              }
            }
          }
        }),
        parseResponse: (res) => {
          return res.data.reader.markets.returnValues.reduce(
            (acc: { marketsData: MarketsData; marketsAddresses: string[] }, marketValues: any) => {
              try {
                const indexToken = getToken(chainId, convertTokenAddress(chainId, marketValues.indexToken, 'native'))
                const longToken = getToken(chainId, marketValues.longToken)
                const shortToken = getToken(chainId, marketValues.shortToken)

                const isSameCollaterals = marketValues.longToken === marketValues.shortToken
                const isSpotOnly = marketValues.indexToken === ethers.constants.AddressZero

                const name = getMarketFullName({ indexToken, longToken, shortToken, isSpotOnly })

                acc.marketsData[marketValues.marketToken] = {
                  marketTokenAddress: marketValues.marketToken,
                  indexTokenAddress: marketValues.indexToken,
                  longTokenAddress: marketValues.longToken,
                  shortTokenAddress: marketValues.shortToken,
                  isSameCollaterals,
                  isSpotOnly,
                  name,
                  data: ''
                }

                acc.marketsAddresses.push(marketValues.marketToken)
              } catch (e) {
                // eslint-disable-next-line no-console
                console.warn('unsupported market', e)
              }

              return acc
            },
            { marketsData: {}, marketsAddresses: [] }
          )
        }
      }),
    staleTime: sTime,
    cacheTime: sTime * CACHE_TIME_MULT,
    opts
  })

  return {
    marketsData: data?.marketsData,
    marketsAddresses: data?.marketsAddresses
  }
}
