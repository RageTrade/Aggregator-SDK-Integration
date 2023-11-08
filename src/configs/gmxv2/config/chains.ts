import { ARBITRUM } from '../../gmx/chains'

export const HIGH_EXECUTION_FEES_MAP: any = {
  [ARBITRUM]: 3 // 3 USD
}

export function getHighExecutionFee(chainId: number) {
  return HIGH_EXECUTION_FEES_MAP[chainId] || 3
}
