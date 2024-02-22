import { BigNumber, UnsignedTransaction } from 'ethers'
import { type WalletClient } from 'viem'

// removed 'type' and 'data' from metadata because they were sent as undefined and were leftover from biconomy types
// also 'type' and 'data' are fields in transaction so it can be conflicting
type ExecutionMetadata = {
  desc: string
  chainId: number
  heading: string
  isUserAction: boolean
  ethRequired?: BigNumber
}
type APICallParams = Parameters<typeof fetch>

export type UnsignedTransactionWithMetadata = { tx: UnsignedTransaction } & ExecutionMetadata
export type APICallParamsWithMetadata = { apiArgs: APICallParams } & ExecutionMetadata

// if return value is defined,
// use fetch params to make request otherwise conitnue with next element
export type RequestSignerFn = (
  wallet: WalletClient,
  agentAddress: string | undefined
) => Promise<APICallParams | undefined>
export type RequestSignerFnWithMetadata = {
  fn: RequestSignerFn
  isEoaSigner: boolean
  isAgentRequired: boolean
} & ExecutionMetadata

// 'ActionParam' represents a 'step' (i.e where signer needs to sign or accept transaction )
// Each step should have single metadata
// write functions from adapters and routers will return ActionParam[] instead of UnsignedTransactionWithMetadata[]
export type ActionParam = UnsignedTransactionWithMetadata | APICallParamsWithMetadata | RequestSignerFnWithMetadata
// for ActionParam[]
// - if unsigned txn, populate gas on correct chain and dispatch, 1 step / txn for user with single returned metadata
// - if sig fn, call fn with wallet and it will prompt for EIP712/ETH sig (which is the only step if "isEoaSigner" is true) and if sig fn returns defined value then make fetch request with that
// - if api call with params => NOT RETURNED CURRENTLY, FOR FUTURE USE (when we might have api keys)

export function isRequestSignerFn(param: ActionParam): param is RequestSignerFnWithMetadata {
  return (param as RequestSignerFnWithMetadata).fn !== undefined
}

export function isUnsignedTxWithMetadata(param: ActionParam): param is UnsignedTransactionWithMetadata {
  return (param as UnsignedTransactionWithMetadata).tx !== undefined
}

export function isAPICallParams(param: ActionParam): param is UnsignedTransactionWithMetadata {
  return (param as APICallParamsWithMetadata).apiArgs !== undefined
}
