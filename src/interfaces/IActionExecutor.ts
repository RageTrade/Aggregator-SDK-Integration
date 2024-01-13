import { BigNumber, PopulatedTransaction, Wallet } from 'ethers'

type ExecutionMetadata = {
  type: string
  desc: string
  chainId: number
  heading: string
  ethRequired: BigNumber
}

type APICallParams = Parameters<typeof fetch>

export type ActionParams = PopulatedTransaction & ExecutionMetadata | APICallParams & ExecutionMetadata
