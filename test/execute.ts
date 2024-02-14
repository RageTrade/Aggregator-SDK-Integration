import { WalletClient } from 'viem'
import { ActionParam, isRequestSignerFn, isUnsignedTxWithMetadata } from '../src/interfaces/IActionExecutor'
import { BigNumber } from 'ethers'

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function execute(wallet: WalletClient, agentWallet: WalletClient, executionPayload: ActionParam[]) {
  const ret = []

  for (const payload of executionPayload) {
    if (isUnsignedTxWithMetadata(payload)) {
      console.log('UNSIGNED TX WITH METADATA')

      const tx = await wallet.sendTransaction({
        chain: wallet.chain,
        account: wallet.account!,
        to: payload.tx.to as `0x${string}`,
        data: payload.tx.data as `0x${string}`,
        value: payload.tx.value ? (payload.tx.value as BigNumber).toBigInt() : 0n
      })

      ret.push(tx)

      console.log(payload.heading, 'success')
      console.dir(tx, { depth: 6 })

      await sleep(2000)
      continue
    }

    if (!isRequestSignerFn(payload)) {
      console.log('API PARAMS')
      ret.push(...(await handleRequest(payload.apiArgs, payload.heading)))

      continue
    }

    console.log('REQUEST SIGNER FN')

    // is submitting
    const fetchPayload = await payload.fn(
      payload.isEoaSigner ? wallet : agentWallet,
      payload.isAgentRequired ? agentWallet.account!.address : undefined
    )

    if (!fetchPayload) continue

    ret.push(...(await handleRequest(fetchPayload, payload.heading)))
  }

  return ret
}

async function handleRequest(args: Parameters<typeof fetch>, heading: string) {
  // is executing
  const ret = []

  const res = await fetch(...args).catch((e) => {
    // failure
    console.log(heading, 'failed (catch block)')
    console.dir(e.body, { depth: 6 })
  })

  if (!res) throw new Error('res not found')

  if (res.ok) {
    // is success
    const data = await res.json()
    ret.push(data)

    console.log(heading, 'success')
    console.dir(data, { depth: 6 })
  } else {
    // failure
    console.log(heading, 'failed (not ok code)')

    try {
      console.dir(await res.json(), { depth: 6 })
    } catch {
      console.dir(res, { depth: 6 })
    }
  }

  return ret
}
