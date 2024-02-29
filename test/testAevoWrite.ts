import { execute } from './execute'
import { createWalletClient, http } from 'viem'
import { optimism, arbitrum } from 'viem/chains'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { tokens } from '../src/common/tokens'
import AevoAdapterV1 from '../src/exchanges/aevo'
import { FixedNumber } from '../src/common/fixedNumber'
import { AEVO_COLLATERAL_TOKEN, aevo as aevoChain } from '../src/configs/aevo/config'
import { CancelOrder, ClosePositionData, CreateOrder, UpdateOrder } from '../src/interfaces/V1/IRouterAdapterBaseV1'
import { earnAevoUSD, redeemAevoUSD } from '../src/configs/aevo/signing'

const p1 = generatePrivateKey()
const p2 = generatePrivateKey()

const wallet = createWalletClient({
  account: privateKeyToAccount(p1),
  transport: http(),
  chain: arbitrum
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
  await aevo.init(wallet.account.address, opts)

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

async function testUpdateOrder() {
  const opts = await testAuthenticateAgent()
  await aevo.init(wallet.account.address, opts)

  const market = (await aevo.supportedMarkets([aevoChain])).find((m) => m.indexToken.symbol === 'ETH')!

  // '0x03faddbc72a102dff7ab5609264fefe4f46355c512d7c19060e2f21ccaa6411e',
  // '0xebe092323608f0a13c063b86bd46e91130716bfb76fe50d0dac1480bf01b0fde',
  // '0xb84afb97c9b37dc1267ac51e92a6834c475118f7a2a2a1f4893aaa2f7388e38c',

  const orderData: UpdateOrder[] = [
    {
      marketId: market.marketId,
      direction: 'LONG',
      sizeDelta: { amount: FixedNumber.fromString('0.011000000000000000'), isTokenAmount: true },
      marginDelta: { amount: FixedNumber.fromString('0'), isTokenAmount: true },
      triggerData: {
        triggerPrice: FixedNumber.fromString('2400.00000001'),
        triggerAboveThreshold: true,
        triggerLimitPrice: FixedNumber.fromString('2500')
      },
      mode: 'ISOLATED',
      orderId: '0xebe092323608f0a13c063b86bd46e91130716bfb76fe50d0dac1480bf01b0fde',
      orderType: 'TAKE_PROFIT_LIMIT'
    },
    {
      marketId: market.marketId,
      direction: 'LONG',
      sizeDelta: { amount: FixedNumber.fromString('0.010000000000000001'), isTokenAmount: true },
      marginDelta: { amount: FixedNumber.fromString('0'), isTokenAmount: true },
      triggerData: {
        triggerPrice: FixedNumber.fromString('3500.00000001'),
        triggerAboveThreshold: true,
        triggerLimitPrice: FixedNumber.fromString('3600')
      },
      mode: 'ISOLATED',
      orderId: '0xb84afb97c9b37dc1267ac51e92a6834c475118f7a2a2a1f4893aaa2f7388e38c',
      orderType: 'STOP_LOSS_LIMIT'
    }
  ]

  const executionPayload = await aevo.updateOrder(orderData, wallet.account.address)
  console.dir(executionPayload, { depth: 4 })

  await execute(wallet, agentWallet, executionPayload)
}

async function testWithdraw() {
  const executionPayload = await aevo.withdraw([
    {
      protocol: 'AEVO',
      chainId: wallet.chain.id,
      token: tokens.USDC,
      amount: FixedNumber.fromString('0.00001').toFormat(6),
      wallet: wallet.account.address
    }
  ])

  await execute(wallet, agentWallet, executionPayload)
}

async function pending() {
  const opts = await testAuthenticateAgent()
  await aevo.init(wallet.account.address, opts)

  const data = await aevo.privateApi.getTransactionHistory()
  console.dir(
    data.transaction_history?.map((d) => d.tx_status),
    { depth: 6 }
  )
}

async function earn() {
  const opts = await testAuthenticateAgent()
  await aevo.init(wallet.account.address, opts)

  const executionPayload = await earnAevoUSD(aevo, 420n)
  await execute(wallet, agentWallet, [executionPayload])
}

async function redeem() {
  const opts = await testAuthenticateAgent()
  await aevo.init(wallet.account.address, opts)

  const executionPayload = await redeemAevoUSD(aevo, 421n)
  await execute(wallet, agentWallet, [executionPayload])
}

// testDeposit()
// testRegister()
// testGetAgentState()
// testAuthenticateAgent()
// testIncreaseOrder()
// testClosePosition()
// testCancelOrder()
// testUpdateOrder()
// testWithdraw()
// pending()
// earn()
// redeem()
