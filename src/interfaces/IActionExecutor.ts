import { BigNumber, PopulatedTransaction, Wallet } from 'ethers'

type ExecutionMetadata = {
  desc: string
  chainId: number
  heading: string
  ethRequired: BigNumber
}
type APICallParams = Parameters<typeof fetch>

type PopulatedTransactionWithMetadata = PopulatedTransaction & ExecutionMetadata
type APICallParamsWithMetadata = { apiArgs: APICallParams } & ExecutionMetadata

export type ActionParams = PopulatedTransactionWithMetadata | APICallParamsWithMetadata
export function isPopulatedTransaction(params: ActionParams): params is PopulatedTransactionWithMetadata {
  return (params as PopulatedTransactionWithMetadata).to !== undefined
}
