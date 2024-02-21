import { execute } from './execute'
import {
  createTestClient,
  createWalletClient,
  http,
  walletActions,
  getContract,
  createPublicClient,
  parseEther
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arbitrum } from 'viem/chains'
import PerennialAdapter, { assetToRageToken } from '../src/exchanges/perennialAdapter'
import { FixedNumber } from '../src/common/fixedNumber'
import { ERC20Abi, SupportedAsset } from '@perennial/sdk'
import { encodeMarketId } from '../src/common/markets'
import { ActionParam } from '../src/interfaces/IActionExecutor'
import { tokens } from '../src/common/tokens'

const rpcUrl = 'http://127.0.0.1:8545'

async function increaseTime(seconds: number = 120) {
  const newTime = Math.floor(new Date().getTime() / 1000 + seconds)
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'evm_setNextBlockTimestamp',
      params: [newTime],
      id: 1
    })
  })

  const data = await response.json()
  if (data.error) {
    console.log('Failed to increase time')
  } else {
    console.log(`Time increased by ${seconds} seconds`)
  }
}

// Anvil default account 0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
const wallet1 = createWalletClient({
  account: privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'),
  transport: http(rpcUrl, { batch: true }),
  chain: arbitrum
})

// Anvil default account 0: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
const wallet2 = createWalletClient({
  account: privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'),
  transport: http(rpcUrl, { batch: true }),
  chain: arbitrum
})
const walletAddress = wallet1.account.address
const perennial = new PerennialAdapter(rpcUrl)
perennial.init(wallet1.account.address) // REQUIRED TO SIMULATE TXs CORRECTLY

// Create Test Account:
const testClient = createTestClient({
  chain: arbitrum,
  mode: 'anvil',
  transport: http(rpcUrl, { batch: true })
}).extend(walletActions)

const usdcContract = getContract({
  address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
  abi: ERC20Abi,
  publicClient: createPublicClient({
    chain: arbitrum,
    transport: http(rpcUrl, { batch: true })
  })
})

async function testWithdrawal() {
  const executionPayload = await perennial.withdraw([
    {
      amount: FixedNumber.fromString('0.01'),
      wallet: walletAddress,
      protocol: 'PERENNIAL',
      market: encodeMarketId(wallet1.chain.id.toString(), 'PERNNIAL', SupportedAsset.eth),
      chainId: wallet1.chain.id,
      token: assetToRageToken(SupportedAsset.eth)
    }
  ])
  console.log('executionPayload', executionPayload)
  const ret = await execute(wallet1, wallet2, executionPayload)
  console.log('withdraw test result', ret)
}

async function testFetchMarkets() {
  const markets = await perennial.supportedMarkets([arbitrum])
  console.log('markets', markets)
}

async function testFetchMarketPrices() {
  const prices = await perennial.getMarketPrices([`${arbitrum.id}-PERENNIAL-eth`])
  console.log('prices', prices)
}

async function testFetchMarketInfo() {
  const info = await perennial.getMarketsInfo([`${arbitrum.id}-PERENNIAL-eth`])
  console.log('info', info)
}

async function fundWallet() {
  // Modify wallet1's USDC.e Balance
  console.log('### Funding wallet')
  const bridge = '0x096760F208390250649E3e8763348E783AEF5562'
  await testClient.setBalance({
    address: bridge,
    value: 100000000000000n
  })
  await testClient.impersonateAccount({
    address: bridge
  })
  await testClient.writeContract({
    address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
    abi: [
      {
        inputs: [
          { internalType: 'address', name: 'account', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' }
        ],
        name: 'bridgeMint',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ] as const,
    functionName: 'bridgeMint',
    account: bridge,
    args: [wallet1.account.address, 100000000000000n],
    gas: 89420n
  })
  const walletBalance = await usdcContract.read.balanceOf([wallet1.account.address])
  console.log('Wallet balance:', walletBalance.toString())
  const approveTx = await perennial._approveUSDC({
    account: wallet1.account.address,
    market: SupportedAsset.eth,
    amount: walletBalance
  })
  if (approveTx) {
    console.log('Approving USDC..')
    await execute(wallet1, wallet2, [approveTx])
    console.log('Approved USDC')
  }
}

async function testDeposit() {
  // Deposit to Perennial
  const executionPayload = await perennial.deposit([
    {
      amount: FixedNumber.fromString('1'),
      wallet: walletAddress,
      protocol: 'PERENNIAL',
      market: encodeMarketId(wallet1.chain.id.toString(), 'PERENNIAL', SupportedAsset.eth),
      chainId: wallet1.chain.id,
      token: assetToRageToken(SupportedAsset.eth)
    }
  ])
  const ret = await execute(wallet1, wallet2, executionPayload)
  console.log('deposit test result', ret)
}

async function testIncreasePosition() {
  console.log('### Testing increasePosition')
  const executionPayload = await perennial.increasePosition(
    [
      {
        sizeDelta: {
          amount: FixedNumber.fromString('.5'),
          isTokenAmount: true
        },
        marginDelta: {
          amount: FixedNumber.fromString('1000'),
          isTokenAmount: false
        },
        direction: 'LONG',
        marketId: encodeMarketId(wallet1.chain.id.toString(), 'PERENNIAL', SupportedAsset.eth),
        mode: 'ISOLATED',
        triggerData: undefined,
        slippage: 20,
        type: 'MARKET',
        collateral: tokens['USDC.e']
      }
    ],
    walletAddress
  )
  const ret = await execute(wallet1, wallet2, executionPayload)
  console.log('increasePosition test result', ret)
}

console.log('Please use the following command to fork the chain so we can simulate responses:')
console.log(`\x1b[33manvil --fork-url https://arb-mainnet.g.alchemy.com/v2/<KEY HERE> \x1b[0m`)

// Wait for the enter key to continue the script
console.log('Press ENTER to continue...')
process.stdin.on('data', async (data) => {
  if (data.toString() === '\n') {
    await fundWallet()
    await increaseTime(30)
    await testIncreasePosition()
    // testDeposit()
  }
})
