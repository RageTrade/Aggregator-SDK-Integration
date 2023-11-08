import { Signer, ethers } from 'ethers'
import { rpc } from '../../../../common/provider'

export const contractFetcher =
  <T>(contractInfo: any, additionalArgs?: any[]) =>
  (args: any): Promise<T> => {
    // eslint-disable-next-line
    console.log({ args })
    const [id, chainId, arg0, arg1, ...params] = args
    const provider = rpc[42161]

    const method = ethers.utils.isAddress(arg0) ? arg1 : arg0

    const contractCall = getContractCall({
      provider,
      contractInfo,
      arg0,
      arg1,
      method,
      params,
      additionalArgs
    })

    let shouldCallFallback = true

    const handleFallback = async (resolve: any, reject: any, error: any) => {
      if (!shouldCallFallback) {
        return
      }
      // prevent fallback from being called twice
      shouldCallFallback = false

      const fallbackProvider = rpc[42161]
      if (!fallbackProvider) {
        reject(error)
        return
      }

      // eslint-disable-next-line no-console
      console.info('using fallbackProvider for', method)
      const fallbackContractCall = getContractCall({
        provider: fallbackProvider,
        contractInfo,
        arg0,
        arg1,
        method,
        params,
        additionalArgs
      })

      fallbackContractCall
        .then((result: any) => resolve(result))
        .catch((e: any) => {
          // eslint-disable-next-line no-console
          console.error('fallback fetcher error', id, contractInfo.contractName, method, e)
          reject(e)
        })
    }

    return new Promise(async (resolve, reject) => {
      contractCall
        .then((result: any) => {
          shouldCallFallback = false
          resolve(result)
        })
        .catch((e: any) => {
          // eslint-disable-next-line no-console
          console.error('fetcher error', id, contractInfo.contractName, method, e)
          handleFallback(resolve, reject, e)
        })

      setTimeout(() => {
        handleFallback(resolve, reject, 'contractCall timeout')
      }, 2000)
    })
  }

type ContractCallType = {
  provider: any
  contractInfo: any
  arg0: any
  arg1: any
  method: any
  params: any
  additionalArgs: any
}

function getContractCall(call: ContractCallType) {
  if (ethers.utils.isAddress(call.arg0)) {
    const address = call.arg0
    const contract = new ethers.Contract(address, call.contractInfo.abi, call.provider)

    if (call.additionalArgs) {
      return contract[call.method](call.params.concat(call.additionalArgs))
    }
    return contract[call.method](call.params)
  }

  if (!call.provider) {
    return
  }

  return call.provider[call.method](call.arg1, call.params)
}
