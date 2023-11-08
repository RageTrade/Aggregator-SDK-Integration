import DataStore from '../abis/DataStore.json'
import SyntheticsReader from '../abis/SyntheticsReader.json'
import { getContract } from '../config/contracts'
import { accountPositionListKey, hashedPositionKey } from '../config/dataStore'
import { BigNumber, ethers } from 'ethers'
import { PositionsData } from './types'
import { getPositionKey } from './utils'
import { ContractMarketPrices, MarketsData } from '../markets/types'
import { TokensData } from '../tokens/types'
import { useMulticall } from '../lib/multicall/useMulticall'
import { getContractMarketPrices } from '../markets/utils'

type PositionsResult = {
  positionsData?: PositionsData
  allPossiblePositionsKeys?: string[]
}

export async function usePositions(
  chainId: number,
  p: {
    marketsInfoData?: MarketsData
    tokensData?: TokensData
    pricesUpdatedAt?: number
    account: string | null | undefined
  }
): Promise<PositionsResult> {
  const { marketsInfoData, tokensData, pricesUpdatedAt, account } = p

  const { data: existingPositionsKeysSet } = await useMulticall(chainId, 'usePositions-keys', {
    key: account ? [account, pricesUpdatedAt] : null,

    // Refresh on every prices update
    refreshInterval: null,
    clearUnusedKeys: true,
    keepPreviousData: true,

    request: () => ({
      dataStore: {
        contractAddress: getContract(chainId, 'DataStore'),
        abi: DataStore.abi,
        calls: {
          keys: {
            methodName: 'getBytes32ValuesAt',
            params: [accountPositionListKey(account!), 0, 1000]
          }
        }
      }
    }),
    parseResponse: (res) => {
      return new Set(res.data.dataStore.keys.returnValues as string[])
    }
  })

  const keysAndPrices = useKeysAndPricesParams({
    marketsInfoData,
    tokensData,
    account,
    existingPositionsKeysSet
  })

  // console.log({ existingPositionsKeysSet })
  // console.log({ keysAndPrices })

  const { data: positionsData } = await useMulticall(chainId, 'usePositionsData', {
    key: keysAndPrices.contractPositionsKeys.length
      ? [keysAndPrices.contractPositionsKeys.join('-'), pricesUpdatedAt]
      : null,

    // Refresh on every prices update
    refreshInterval: null,
    clearUnusedKeys: true,
    keepPreviousData: true,

    request: () => ({
      reader: {
        contractAddress: getContract(chainId, 'SyntheticsReader'),
        abi: SyntheticsReader.abi,
        calls: {
          positions: {
            methodName: 'getAccountPositionInfoList',
            params: [
              getContract(chainId, 'DataStore'),
              getContract(chainId, 'ReferralStorage'),
              keysAndPrices!.contractPositionsKeys,
              keysAndPrices!.marketsPrices,
              // uiFeeReceiver
              ethers.constants.AddressZero
            ]
          }
        }
      }
    }),
    parseResponse: (res) => {
      const positions = res.data.reader.positions.returnValues

      return positions.reduce((positionsMap: PositionsData, positionInfo: any, i: number) => {
        const { position, fees } = positionInfo
        const { addresses, numbers, flags, data } = position
        const { account, market: marketAddress, collateralToken: collateralTokenAddress } = addresses

        // Empty position
        if (BigNumber.from(numbers.increasedAtBlock).eq(0)) {
          return positionsMap
        }

        const positionKey = getPositionKey(account, marketAddress, collateralTokenAddress, flags.isLong)
        const contractPositionKey = keysAndPrices!.contractPositionsKeys[i]

        positionsMap[positionKey] = {
          key: positionKey,
          contractKey: contractPositionKey,
          account,
          marketAddress,
          collateralTokenAddress,
          sizeInUsd: BigNumber.from(numbers.sizeInUsd),
          sizeInTokens: BigNumber.from(numbers.sizeInTokens),
          collateralAmount: BigNumber.from(numbers.collateralAmount),
          increasedAtBlock: BigNumber.from(numbers.increasedAtBlock),
          decreasedAtBlock: BigNumber.from(numbers.decreasedAtBlock),
          isLong: flags.isLong,
          pendingBorrowingFeesUsd: BigNumber.from(fees.borrowing.borrowingFeeUsd),
          fundingFeeAmount: BigNumber.from(fees.funding.fundingFeeAmount),
          claimableLongTokenAmount: BigNumber.from(fees.funding.claimableLongTokenAmount),
          claimableShortTokenAmount: BigNumber.from(fees.funding.claimableShortTokenAmount),
          data
        }

        return positionsMap
      }, {} as PositionsData)
    }
  })

  // const optimisticPositionsData = useOptimisticPositions({
  //   positionsData: positionsData,
  //   allPositionsKeys: keysAndPrices?.allPositionsKeys
  // })

  return {
    positionsData: positionsData
  }
}

function useKeysAndPricesParams(p: {
  account: string | null | undefined
  marketsInfoData: MarketsData | undefined
  tokensData: TokensData | undefined
  existingPositionsKeysSet: Set<string> | undefined
}) {
  const { account, marketsInfoData, tokensData, existingPositionsKeysSet } = p

  const values = {
    allPositionsKeys: [] as string[],
    contractPositionsKeys: [] as string[],
    marketsPrices: [] as ContractMarketPrices[]
  }

  if (!account || !marketsInfoData || !tokensData) {
    return values
  }

  const markets = Object.values(marketsInfoData)

  for (const market of markets) {
    const marketPrices = getContractMarketPrices(tokensData, market)

    if (!marketPrices) {
      continue
    }

    const collaterals = market.isSameCollaterals
      ? [market.longTokenAddress]
      : [market.longTokenAddress, market.shortTokenAddress]

    for (const collateralAddress of collaterals) {
      for (const isLong of [true, false]) {
        const positionKey = getPositionKey(account, market.marketTokenAddress, collateralAddress, isLong)
        values.allPositionsKeys.push(positionKey)

        const contractPositionKey = hashedPositionKey(account, market.marketTokenAddress, collateralAddress, isLong)

        if (existingPositionsKeysSet?.has(contractPositionKey)) {
          values.contractPositionsKeys.push(contractPositionKey)
          values.marketsPrices.push(marketPrices)
        }
      }
    }
  }

  return values
}
