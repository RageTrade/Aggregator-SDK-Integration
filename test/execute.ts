import { WalletClient } from 'viem'
import { ActionParam, isRequestSignerFn, isUnsignedTxWithMetadata } from '../src/interfaces/IActionExecutor'
import { BigNumber } from 'ethers'

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function execute(wallet: WalletClient, agentWallet: WalletClient, executionPayload: ActionParam[]) {
  const ret = []

  for (const payload of executionPayload) {
    if (isUnsignedTxWithMetadata(payload)) {
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

    let fetchPayload
    if (isRequestSignerFn(payload)) {
      // is submitting
      fetchPayload = await payload.fn(
        payload.isEoaSigner ? wallet : agentWallet,
        payload.isAgentRequired ? agentWallet.account!.address : undefined
      )
    } else if (payload.apiArgs != null) {
      fetchPayload = payload.apiArgs
    }

    if (!fetchPayload) continue

    // is executing
    const res = await fetch(...fetchPayload).catch((e) => {
      // failure
      console.log(payload.heading, 'failed (catch block)')
      console.dir(e.body, { depth: 6 })
    })

    if (!res) throw new Error('res not found')

    if (res.ok) {
      // is success
      const data = await res.json()
      ret.push(data)

      console.log(payload.heading, 'success')
      console.dir(data, { depth: 6 })
    } else {
      // failure
      console.log(payload.heading, 'failed (not ok code)')

      try {
        console.dir(await res.json(), { depth: 6 })
      } catch {
        console.dir(res, { depth: 6 })
      }
    }
  }

  return ret
}
