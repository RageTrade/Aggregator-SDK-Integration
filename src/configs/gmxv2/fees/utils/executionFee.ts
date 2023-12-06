import { getHighExecutionFee } from '../../config/chains'
import { NATIVE_TOKEN_ADDRESS } from '../../config/tokens'
import { BigNumber } from 'ethers'
import { ExecutionFee, GasLimitsConfig } from '../types'
import { TokensData } from '../../tokens/types'
import { convertToUsd, getTokenData } from '../../tokens/utils'
import { USD_DECIMALS, applyFactor, expandDecimals } from '../../lib/numbers'
import { getContract } from '../../config/contracts'
import {
  decreaseOrderGasLimitKey,
  depositGasLimitKey,
  increaseOrderGasLimitKey,
  singleSwapGasLimitKey,
  swapOrderGasLimitKey,
  withdrawalGasLimitKey
} from '../../config/dataStore'
import { hashString } from '../../hash'
import { useMulticall } from '../../lib/multicall/useMulticall'
import DataStore from '../../abis/DataStore.json'
import { GAS_PRICE_ADJUSTMENT_MAP } from '../../../gmx/chains'
import { cacheFetch } from '../../../../common/cache'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { CACHE_MINUTE } from '@kwenta/sdk/src/common/cache'

export const ESTIMATED_GAS_FEE_BASE_AMOUNT = hashString('ESTIMATED_GAS_FEE_BASE_AMOUNT')
export const ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR = hashString('ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR')

export function getExecutionFee(
  chainId: number,
  gasLimts: GasLimitsConfig,
  tokensData: TokensData,
  estimatedGasLimit: BigNumber,
  gasPrice: BigNumber
): ExecutionFee | undefined {
  const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS)

  if (!nativeToken) return undefined

  const baseGasLimit = gasLimts.estimatedFeeBaseGasLimit
  const multiplierFactor = gasLimts.estimatedFeeMultiplierFactor
  const adjustedGasLimit = baseGasLimit.add(applyFactor(estimatedGasLimit, multiplierFactor))

  const feeTokenAmount = adjustedGasLimit.mul(gasPrice)

  const feeUsd = convertToUsd(feeTokenAmount, nativeToken.decimals, nativeToken.prices.minPrice)!

  const isFeeHigh = feeUsd.gt(expandDecimals(getHighExecutionFee(chainId), USD_DECIMALS))

  const warning = isFeeHigh
    ? `The network cost to send transactions is high at the moment, please check the "Max Execution Fee" value before proceeding.`
    : undefined

  return {
    feeUsd,
    feeTokenAmount,
    feeToken: nativeToken,
    warning
  }
}

export function estimateExecuteDepositGasLimit(
  gasLimits: GasLimitsConfig,
  deposit: {
    longTokenSwapsCount?: number
    shortTokenSwapsCount?: number
    initialLongTokenAmount?: BigNumber
    initialShortTokenAmount?: BigNumber
    callbackGasLimit?: BigNumber
  }
) {
  const gasPerSwap = gasLimits.singleSwap
  const swapsCount = (deposit.longTokenSwapsCount || 0) + (deposit.shortTokenSwapsCount || 0)

  const gasForSwaps = gasPerSwap.mul(swapsCount)
  const isMultiTokenDeposit = deposit.initialLongTokenAmount?.gt(0) && deposit.initialShortTokenAmount?.gt(0)

  const depositGasLimit = isMultiTokenDeposit ? gasLimits.depositMultiToken : gasLimits.depositSingleToken

  return depositGasLimit.add(gasForSwaps).add(deposit.callbackGasLimit || 0)
}

export function estimateExecuteWithdrawalGasLimit(
  gasLimits: GasLimitsConfig,
  withdrawal: { callbackGasLimit?: BigNumber }
) {
  return gasLimits.withdrawalMultiToken.add(withdrawal.callbackGasLimit || 0)
}

export function estimateExecuteIncreaseOrderGasLimit(
  gasLimits: GasLimitsConfig,
  order: { swapsCount?: number; callbackGasLimit?: BigNumber }
) {
  return gasLimits.increaseOrder.add(gasLimits.singleSwap.mul(order.swapsCount || 0)).add(order.callbackGasLimit || 0)
}

export function estimateExecuteDecreaseOrderGasLimit(
  gasLimits: GasLimitsConfig,
  order: { swapsCount?: number; callbackGasLimit?: BigNumber }
) {
  return gasLimits.decreaseOrder.add(gasLimits.singleSwap.mul(order.swapsCount || 0)).add(order.callbackGasLimit || 0)
}

export function estimateExecuteSwapOrderGasLimit(
  gasLimits: GasLimitsConfig,
  order: { swapsCount?: number; callbackGasLimit?: BigNumber }
) {
  return gasLimits.swapOrder.add(gasLimits.singleSwap.mul(order.swapsCount || 0)).add(order.callbackGasLimit || 0)
}

type GasLimitsResult = {
  gasLimits?: GasLimitsConfig
}

export async function useGasLimits(chainId: number): Promise<GasLimitsResult> {
  const { data } = await useMulticall(chainId, 'useGasLimitsConfig', {
    key: [],

    refreshInterval: 60000,

    request: () => ({
      dataStore: {
        contractAddress: getContract(chainId, 'DataStore'),
        abi: DataStore.abi,
        calls: {
          depositSingleToken: {
            methodName: 'getUint',
            params: [depositGasLimitKey(true)]
          },
          depositMultiToken: {
            methodName: 'getUint',
            params: [depositGasLimitKey(false)]
          },
          withdrawalMultiToken: {
            methodName: 'getUint',
            params: [withdrawalGasLimitKey()]
          },
          singleSwap: {
            methodName: 'getUint',
            params: [singleSwapGasLimitKey()]
          },
          swapOrder: {
            methodName: 'getUint',
            params: [swapOrderGasLimitKey()]
          },
          increaseOrder: {
            methodName: 'getUint',
            params: [increaseOrderGasLimitKey()]
          },
          decreaseOrder: {
            methodName: 'getUint',
            params: [decreaseOrderGasLimitKey()]
          },
          estimatedFeeBaseGasLimit: {
            methodName: 'getUint',
            params: [ESTIMATED_GAS_FEE_BASE_AMOUNT]
          },
          estimatedFeeMultiplierFactor: {
            methodName: 'getUint',
            params: [ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR]
          }
        }
      }
    }),
    parseResponse: (res) => {
      const results = res.data.dataStore

      return {
        depositSingleToken: BigNumber.from(results.depositSingleToken.returnValues[0]),
        depositMultiToken: BigNumber.from(results.depositMultiToken.returnValues[0]),
        withdrawalMultiToken: BigNumber.from(results.withdrawalMultiToken.returnValues[0]),
        singleSwap: BigNumber.from(results.singleSwap.returnValues[0]),
        swapOrder: BigNumber.from(results.swapOrder.returnValues[0]),
        increaseOrder: BigNumber.from(results.increaseOrder.returnValues[0]),
        decreaseOrder: BigNumber.from(results.decreaseOrder.returnValues[0]),
        estimatedFeeBaseGasLimit: BigNumber.from(results.estimatedFeeBaseGasLimit.returnValues[0]),
        estimatedFeeMultiplierFactor: BigNumber.from(results.estimatedFeeMultiplierFactor.returnValues[0])
      }
    }
  })

  return {
    gasLimits: data
  }
}

export const EXECUTION_FEE_CONFIG_V2: {
  [chainId: number]: {
    shouldUseMaxPriorityFeePerGas: boolean
    defaultBufferBps?: number
  }
} = {
  [42161]: {
    shouldUseMaxPriorityFeePerGas: false,
    defaultBufferBps: 1000 // 10%
  }
}

const provider = new StaticJsonRpcProvider('https://arb1.arbitrum.io/rpc')

export async function useGasPrice(chainId: number) {
  const executionFeeConfig = EXECUTION_FEE_CONFIG_V2[chainId]

  const data = await cacheFetch({
    key: ['gasPrice', chainId, executionFeeConfig.shouldUseMaxPriorityFeePerGas, 1000],
    fn: async () => {
      let gasPrice = await provider.getGasPrice()

      if (executionFeeConfig.shouldUseMaxPriorityFeePerGas) {
        const feeData = await provider.getFeeData()

        // the wallet provider might not return maxPriorityFeePerGas in feeData
        // in which case we should fallback to the usual getGasPrice flow handled below
        if (feeData && feeData.maxPriorityFeePerGas) {
          gasPrice = gasPrice.add(feeData.maxPriorityFeePerGas)
        }
      }

      const premium = GAS_PRICE_ADJUSTMENT_MAP[42161]
      return gasPrice.add(premium)
    },
    staleTime: CACHE_MINUTE / 2,
    cacheTime: CACHE_MINUTE
  })

  return { gasPrice: data }
}
