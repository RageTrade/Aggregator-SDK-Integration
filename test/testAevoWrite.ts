import { createWalletClient, http } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import AevoAdapterV1 from '../src/exchanges/aevo'
import { tokens } from '../src/common/tokens'
import { FixedNumber } from '../src/common/fixedNumber'
import { optimism, arbitrum } from 'viem/chains'
import { execute } from './execute'

const wallet = createWalletClient({
  account: privateKeyToAccount(generatePrivateKey()),
  transport: http(),
  chain: optimism
})

const agentWallet = createWalletClient({
  account: privateKeyToAccount(generatePrivateKey()),
  transport: http(),
  chain: optimism
})

console.log('using wallet', wallet.account.address)
console.log('using agent wallet', agentWallet.account.address)

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

  await execute(wallet, agentWallet, executionPayload)
}

// testDeposit()
testRegister()
