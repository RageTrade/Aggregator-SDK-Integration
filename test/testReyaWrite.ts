import { execute } from './execute'
import { createWalletClient, http } from 'viem'
import { optimism } from 'viem/chains'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { tokens } from '../src/common/tokens'
import { FixedNumber } from '../fixedNumber'
import { ReyaAdapterV1 } from '../src/exchanges/reya'
import { REYA_COLLATERAL_TOKEN } from '../src/configs/reya/chains'
import { reya as reyaChain } from '../src/configs/reya/config'
import { CancelOrder, ClosePositionData, CreateOrder, UpdateOrder } from '../src/interfaces'

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
console.log('agent wallet pk', p2)

const reya = new ReyaAdapterV1()


async function testDeposit() {

  await reya.init(wallet.account.address)
  const executionPayload = await reya.deposit([
    {
      protocol: 'REYA',
      chainId: wallet.chain.id,
      token: tokens['USDC.e'],
      amount: FixedNumber.fromString('13'),
      wallet: wallet.account.address
    }
  ])

  await execute(wallet, agentWallet, executionPayload)
}

async function testWithdraw() {
  await reya.init(wallet.account.address)
  const executionPayload = await reya.withdraw([
    {
      protocol: 'REYA',
      chainId: wallet.chain.id,
      token: REYA_COLLATERAL_TOKEN, // @TODO Update this one
      amount: FixedNumber.fromString('10').toFormat(6),
      wallet: wallet.account.address
    }
  ])

  await execute(wallet, agentWallet, executionPayload)
}

async function testIncreaseOrder() {
  await reya.init(wallet.account.address)

  const market = (await reya.supportedMarkets([reyaChain])).find((m) => m.indexToken.symbol === 'BTC')!

  const orderData: CreateOrder[] = [
    {
      marketId: market.marketId,
      direction: 'LONG',
      sizeDelta: { amount: FixedNumber.fromString('0.001'), isTokenAmount: true },
      marginDelta: { amount: FixedNumber.fromString('6.117002'), isTokenAmount: true },
      triggerData: {
        triggerPrice: FixedNumber.fromString('50000'),
        triggerAboveThreshold: true,
        triggerLimitPrice: undefined
      },
      collateral: REYA_COLLATERAL_TOKEN,
      type: 'MARKET',
      mode: 'CROSS',
      slippage: undefined
    }
  ]

  const executionPayload = await reya.increasePosition(orderData, wallet.account.address)
  console.dir(executionPayload, { depth: 4 })

  await execute(wallet, agentWallet, executionPayload)
}

async function testClosePosition() {
  await reya.init(wallet.account.address)

  const positionData = (await reya.getAllPositions(wallet.account.address, undefined)).result.find(
    (m) => m.indexToken.symbol === 'BTC'
  )!
  const orderData: ClosePositionData[] = [
    {
      closeSize: { amount: FixedNumber.fromString('0.001'), isTokenAmount: true },
      triggerData: undefined,
      slippage: undefined,
      // type: 'STOP_LOSS',
      // type: 'TAKE_PROFIT',
      // type: 'STOP_LOSS_LIMIT',
      type: 'MARKET',
      outputCollateral: REYA_COLLATERAL_TOKEN
    },
    {
      closeSize: { amount: FixedNumber.fromString('0.02'), isTokenAmount: true },
      triggerData: {
        triggerPrice: FixedNumber.fromString('70000'),
        triggerAboveThreshold: true,
        triggerLimitPrice: undefined
      },
      slippage: undefined,
      type: 'TAKE_PROFIT',
      outputCollateral: REYA_COLLATERAL_TOKEN
    },
  ]

  const executionPayload = await reya.closePosition(
    [positionData, positionData],
    orderData,
    wallet.account.address
  )
  console.dir(executionPayload, { depth: 4 })

  await execute(wallet, agentWallet, executionPayload)
}

async function testCancelOrder() {
  await reya.init(wallet.account.address)

  const allOrders = (await reya.getAllOrders(wallet.account.address, undefined)).result
  console.dir(allOrders, { depth: 4 })

  const orderData: CancelOrder[] = allOrders.map((o) => {
    return { marketId: o.marketId, orderId: o.orderId, type: o.orderType }
  })

  const executionPayload = await reya.cancelOrder(orderData, wallet.account.address)
  console.dir(executionPayload, { depth: 4 })

  await execute(wallet, agentWallet, executionPayload)
}

async function testUpdateOrder() {

  await reya.init(wallet.account.address)

  const market = (await reya.supportedMarkets([reyaChain])).find((m) => m.indexToken.symbol === 'BTC')!

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
        triggerPrice: FixedNumber.fromString('80000'),
        triggerAboveThreshold: true,
        triggerLimitPrice: undefined
      },
      mode: 'CROSS',
      orderId: 'eadc9c31-9b1a-4ee0-bfa2-5228a94ccca4',
      orderType: 'TAKE_PROFIT'
    },
  ]

  const executionPayload = await reya.updateOrder(orderData, wallet.account.address)
  console.dir(executionPayload, { depth: 4 })

  await execute(wallet, agentWallet, executionPayload)
}
// testDeposit()
// testWithdraw()
// testIncreaseOrder()
// testClosePosition()
//testCancelOrder()
//testUpdateOrder()
