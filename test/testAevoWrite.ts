import { execute } from './execute'
import { createWalletClient, http } from 'viem'
import { optimism, arbitrum } from 'viem/chains'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { tokens } from '../src/common/tokens'
import AevoAdapterV1 from '../src/exchanges/aevo'
import { FixedNumber } from '../src/common/fixedNumber'
import { AEVO_COLLATERAL_TOKEN, aevo as aevoChain } from '../src/configs/aevo/config'
import { CancelOrder, ClosePositionData, CreateOrder } from '../src/interfaces/V1/IRouterAdapterBaseV1'

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

const ethMarketId = '42161-AEVO-ETH'

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

  return opts
}

async function testIncreaseOrder() {
  const opts = await testAuthenticateAgent()

  const market = (await aevo.supportedMarkets([aevoChain])).find((m) => m.indexToken.symbol === 'BTC')!

  const orderData: CreateOrder[] = [
    {
      marketId: market.marketId,
      direction: 'LONG',
      sizeDelta: { amount: FixedNumber.fromString('0.0005'), isTokenAmount: true },
      marginDelta: { amount: FixedNumber.fromString('6.117002'), isTokenAmount: true },
      triggerData: {
        triggerPrice: FixedNumber.fromString('50000'),
        triggerAboveThreshold: true,
        triggerLimitPrice: undefined
      },
      collateral: AEVO_COLLATERAL_TOKEN,
      type: 'LIMIT',
      mode: 'ISOLATED',
      slippage: undefined
    }
  ]

  const executionPayload = await aevo.increasePosition(orderData, wallet.account.address, opts)
  console.dir(executionPayload, { depth: 4 })

  await execute(wallet, agentWallet, executionPayload)
}

async function testClosePosition() {
  const opts = await testAuthenticateAgent()
  await aevo.init(wallet.account.address, opts)

  const positionData = (await aevo.getAllPositions(wallet.account.address, undefined, opts)).result.find(
    (m) => m.indexToken.symbol === 'ETH'
  )!
  console.dir(positionData, { depth: 6 })

  const orderData: ClosePositionData[] = [
    {
      closeSize: { amount: FixedNumber.fromString('0.02'), isTokenAmount: true },
      triggerData: {
        triggerPrice: FixedNumber.fromString('3007.00000001'),
        triggerAboveThreshold: true,
        triggerLimitPrice: FixedNumber.fromString('2999.0000000001')
        // triggerLimitPrice: FixedNumber.fromString('2200.00000001'),
      },
      // type: 'STOP_LOSS',
      // type: 'TAKE_PROFIT',
      // type: 'STOP_LOSS_LIMIT',
      type: 'TAKE_PROFIT_LIMIT',
      outputCollateral: AEVO_COLLATERAL_TOKEN
    },
    {
      closeSize: { amount: FixedNumber.fromString('0.02'), isTokenAmount: true },
      triggerData: {
        triggerPrice: FixedNumber.fromString('3008.00000001'),
        triggerAboveThreshold: true,
        triggerLimitPrice: FixedNumber.fromString('2999.0000000001')
        // triggerLimitPrice: FixedNumber.fromString('2200.00000001'),
      },
      // type: 'STOP_LOSS',
      // type: 'TAKE_PROFIT',
      // type: 'STOP_LOSS_LIMIT',
      type: 'TAKE_PROFIT_LIMIT',
      outputCollateral: AEVO_COLLATERAL_TOKEN
    },
    {
      closeSize: { amount: FixedNumber.fromString('0.02'), isTokenAmount: true },
      triggerData: {
        triggerPrice: FixedNumber.fromString('3009.00000001'),
        triggerAboveThreshold: true,
        triggerLimitPrice: FixedNumber.fromString('2999.0000000001')
        // triggerLimitPrice: FixedNumber.fromString('2200.00000001'),
      },
      // type: 'STOP_LOSS',
      // type: 'TAKE_PROFIT',
      // type: 'STOP_LOSS_LIMIT',
      type: 'TAKE_PROFIT_LIMIT',
      outputCollateral: AEVO_COLLATERAL_TOKEN
    }
  ]

  const executionPayload = await aevo.closePosition(
    [positionData, positionData, positionData],
    orderData,
    wallet.account.address
  )
  console.dir(executionPayload, { depth: 4 })

  await execute(wallet, agentWallet, executionPayload)
}

async function testCancelOrder() {
  const opts = await testAuthenticateAgent()
  await aevo.init(wallet.account.address, opts)

  const allOrders = (await aevo.getAllOrders(wallet.account.address, undefined)).result
  console.dir(allOrders, { depth: 4 })

  const orderData: CancelOrder[] = allOrders.map((o) => {
    return { marketId: o.marketId, orderId: o.orderId, type: o.orderType }
  })

  const executionPayload = await aevo.cancelOrder(orderData, wallet.account.address)
  console.dir(executionPayload, { depth: 4 })

  await execute(wallet, agentWallet, executionPayload)
}

// testDeposit()
// testRegister()
// testGetAgentState()
// testAuthenticateAgent()
// testIncreaseOrder()
// testClosePosition()
testCancelOrder()
