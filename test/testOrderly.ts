import { config } from 'dotenv'
import OrderlyAdapter from '../src/exchanges/orderly'
import { encodeBase58 } from 'ethers-v6'
import { utils } from '@noble/ed25519'
import { webcrypto } from 'node:crypto'
import {
  ActionParam,
  RequestSignerFnWithMetadata,
  UnsignedTransactionWithMetadata
} from '../src/interfaces/IActionExecutor'
import { privateKeyToAccount } from 'viem/accounts'
import { WalletClient, createWalletClient, defineChain, http } from 'viem'
import { FixedNumber } from '../src/common/fixedNumber'
import { BigNumber } from 'ethers'
import { execute } from './execute'
import { API } from '@orderly.network/types'
import { ORDERLY_COLLATERAL_TOKEN } from '../src/configs/orderly/config'
import { ZERO_FN } from '../src/common/constants'

// @see https://github.com/paulmillr/noble-ed25519?tab=readme-ov-file#usage
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto

config()

const arbitrumSepolia = defineChain({
  id: 421614,
  name: 'Arbitrum Sepolia',
  network: 'arbitrum-sepolia',
  nativeCurrency: {
    name: 'Arbitrum Sepolia Ether',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ['https://arbitrum-sepolia.publicnode.com']
    },
    public: {
      http: ['https://arbitrum-sepolia.publicnode.com']
    }
  },
  blockExplorers: {
    default: {
      name: 'Arbiscan',
      url: 'https://sepolia.arbiscan.io/'
    }
  },
  testnet: true
})

async function testOrderly(wallet: WalletClient, brokerId: string, chainId: number) {
  let res: Response
  const orderlyClient = new OrderlyAdapter(wallet.account!.address, brokerId, chainId)

  const privateKey = utils.randomPrivateKey()
  const orderlyKey = `ed25519:${encodeBase58(privateKey)}`

  let actionParams: ActionParam[] = await orderlyClient.authenticateAgent(
    [
      {
        agentAddress: orderlyKey,
        protocolId: 'ORDERLY'
      }
    ],
    '',
    {
      orderlyAuth: {
        keyExpirationInDays: 1
      },
      bypassCache: false
    }
  )
  console.log('authenticateAgent', actionParams)
  await execute(wallet, wallet, actionParams)

  const agentState = await orderlyClient.getAgentState('', [
    {
      protocolId: 'ORDERLY',
      agentAddress: ''
    }
  ])
  console.log('agentState', agentState)

  res = await orderlyClient.signAndSendRequest('/v1/client/holding')
  const accountHolding = (await res.json()).data.holding as API.Holding[]
  console.log('accountHolding', accountHolding)
  // uncomment to use testnet faucet. It seems to be very slow, so only call once
  // const hasEnoughUSDC = accountHolding.find((holding) => holding.token === 'USDC' && holding.holding > 100)
  // if (!hasEnoughUSDC) {
  //   await fetch('https://testnet-operator-evm.orderly.org/v1/faucet/usdc')
  // }

  const accountInfo = await orderlyClient.getAccountInfo('', undefined)
  console.log('accountInfo', accountInfo)

  // deposit and withdraw have CeFi delay
  // actionParams = await orderlyClient.deposit([
  //   {
  //     protocol: 'ORDERLY',
  //     amount: FixedNumber.fromString('5'),
  //     wallet: wallet.account!.address,
  //     token: '' as any,
  //     chainId: 0
  //   }
  // ])
  // await execute(wallet, wallet, actionParams)

  // actionParams = await orderlyClient.withdraw([
  //   {
  //     protocol: 'ORDERLY',
  //     amount: FixedNumber.fromString('5'),
  //     wallet: wallet.account!.address,
  //     token: '' as any,
  //     chainId: 0
  //   }
  // ])
  // await execute(wallet, wallet, actionParams)

  const supportedMarkets = await orderlyClient.supportedMarkets(undefined)
  const marketIds = supportedMarkets.map(({ marketId }) => marketId)
  console.log('marketIds', marketIds)

  // const marketMetadata = await orderlyClient.getDynamicMarketMetadata(marketIds)
  // console.log('marketMetadata', marketMetadata)

  // const orderBooks = await orderlyClient.getOrderBooks(marketIds, [undefined])
  // console.log('orderBooks', orderBooks)

  // actionParams = await orderlyClient.increasePosition(
  //   [
  //     {
  //       collateral: ORDERLY_COLLATERAL_TOKEN,
  //       direction: 'LONG',
  //       marketId: '291-ORDERLY-PERP_BTC_USDC',
  //       mode: 'CROSS',
  //       type: 'MARKET',
  //       sizeDelta: {
  //         amount: FixedNumber.fromString('0.001'),
  //         isTokenAmount: true
  //       },
  //       marginDelta: { amount: ZERO_FN, isTokenAmount: true },
  //       triggerData: undefined,
  //       slippage: undefined
  //     }
  //   ],
  //   ''
  // )
  // console.log('actionParams', actionParams)
  // await execute(wallet, wallet, actionParams)

  const allPositions = await orderlyClient.getAllPositions(wallet.account!.address, undefined)
  console.log('allPositions', allPositions)

  // actionParams = await orderlyClient.closePosition(
  //   allPositions.result,
  //   allPositions.result.map((position) => ({
  //     closeSize: position.size,
  //     type: 'MARKET',
  //     outputCollateral: undefined,
  //     triggerData: undefined
  //   })),
  //   ''
  // )
  // console.log('actionParams', actionParams)
  // await execute(wallet, wallet, actionParams)

  // actionParams = await orderlyClient.settlePnl()
  // console.log('actionParams', actionParams)
  // await execute(wallet, wallet, actionParams)

  const allOrders = await orderlyClient.getAllOrders(wallet.account!.address, undefined)
  console.log('allOrders', allOrders)

  const liqHistory = await orderlyClient.getLiquidationHistory(wallet.account!.address, undefined)
  console.log('liqHistory', liqHistory)
}

async function main() {
  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`)

  const client = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http('https://arbitrum-sepolia.publicnode.com')
  })

  await testOrderly(client, 'woofi_pro', 421614)
}
main()
