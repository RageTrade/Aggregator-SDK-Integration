import { execute } from './execute'
import { createWalletClient, http } from 'viem'
import { optimism, arbitrum } from 'viem/chains'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { tokens } from '../src/common/tokens'
import AevoAdapterV1 from '../src/exchanges/aevo'
import { FixedNumber } from '../src/common/fixedNumber'

const p1 = generatePrivateKey()
const p2 = generatePrivateKey()

const wallet = createWalletClient({
  account: privateKeyToAccount(p1),
  transport: http(),
  chain: optimism
})

const agentWallet = createWalletClient({
  account: privateKeyToAccount(p2),
  transport: http(),
  chain: optimism
})

console.log('using wallet', wallet.account.address)
console.log('wallet pk', p1)
console.log('using agent wallet', agentWallet.account.address)
console.log('agent wallet pk', p2)

const aevo = new AevoAdapterV1()

async function testDeposit() {
  const executionPayload = await aevo.deposit([
    {
      protocol: 'AEVO',
      chainId: wallet.chain.id,
      token: tokens.WETH,
      amount: FixedNumber.fromString('0.013'),
      wallet: wallet.account.address
    }
  ])

  await execute(wallet, agentWallet, executionPayload)

  // await aevo.deposit([
  //   {
  //     protocol: 'AEVO',
  //     chainId: wallet.chain.id,
  //     token: tokens.USDC,
  //     amount: FixedNumber.fromString('1.5'),
  //     wallet: wallet.account.address
  //   }
  // ])
}

async function testRegister() {
  const executionPayload = await aevo._register(wallet.account.address)

  const data = await execute(wallet, agentWallet, executionPayload)

  const key = data[0].api_key as string
  const secret = data[0].api_secret as string

  console.log({ key, secret })

  // below calls internal method directly
  // but UI would save it in local storage and pass it in function calls
  aevo._setCredentials(
    {
      aevoAuth: {
        apiKey: key,
        secret
      },
      bypassCache: false
    },
    true
  )
}

async function testGetAgentState() {
  const apiKey = 'replace_with_api_key'
  const secret = 'replace_with_api_secret'

  const state = await aevo.getAgentState(
    wallet.account.address,
    [
      {
        protocolId: 'AEVO',
        agentAddress: agentWallet.account.address
      }
    ],
    {
      aevoAuth: {
        apiKey,
        secret
      },
      bypassCache: false
    }
  )

  console.log(state)
}

async function testAuthenticateAgent() {
  const executionPayload = await aevo.authenticateAgent(
    [
      {
        protocolId: 'AEVO',
        agentAddress: agentWallet.account.address
      }
    ],
    wallet.account.address
  )

  const data = await execute(wallet, agentWallet, executionPayload)

  const key = data[0].api_key as string
  const secret = data[0].api_secret as string

  console.log({ key, secret })

  // below calls internal method directly
  // but UI would save it in local storage and pass it in function calls

  const opts = {
    aevoAuth: {
      apiKey: key,
      secret
    },
    bypassCache: false
  }

  const state = await aevo.getAgentState(
    wallet.account.address,
    [
      {
        protocolId: 'AEVO',
        agentAddress: agentWallet.account.address
      }
    ],
    opts
  )

  console.log(state)
}

// testDeposit()
// testRegister()
// testGetAgentState()
testAuthenticateAgent()
