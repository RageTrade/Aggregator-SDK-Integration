import { Wallet, ethers } from 'ethers'
import { UnsignedTransaction, formatUnits } from 'ethers/lib/utils'
import { tokens } from '../src/common/tokens'

import { FixedNumber } from '../src/common/fixedNumber'
import HyperliquidAdapterV1 from '../src/exchanges/hyperliquid'
import { StaticJsonRpcProvider } from '@ethersproject/providers'
import {
  HL_COLLATERAL_TOKEN,
  approveAgent,
  cancelOrders,
  checkIfRageTradeAgent,
  getExtraAgents,
  getMeta,
  getOpenOrders,
  getPoints,
  getWebdata2,
  modifyOrders,
  placeOrders,
  setReferralCode,
  updateIsolatedMargin,
  updateLeverage
} from '../src/configs/hyperliquid/api/client'
import {
  ActionParam,
  UnsignedTransactionWithMetadata,
  isRequestSignerFn,
  isUnsignedTxWithMetadata
} from '../src/interfaces/IActionExecutor'
import { hyperliquid } from '../src/configs/hyperliquid/api/config'
import {
  CancelOrder,
  ClosePositionData,
  CreateOrder,
  OrderData,
  PositionData,
  PositionInfo,
  UpdateOrder,
  UpdatePositionMarginData
} from '../src/interfaces/V1/IRouterAdapterBaseV1'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, http } from 'viem'
import { arbitrum, mainnet } from 'viem/chains'

async function main() {
  const hl = new HyperliquidAdapterV1()

  const provider = new StaticJsonRpcProvider('https://arb1.arbitrum.io/rpc')

  const wallet = new Wallet('INPUT_PK', provider)
  const walletAgent = new Wallet('INPUT_PK', provider)

  // ** DEPOSIT ** //

  // const bal = await hl.usdc.balanceOf(wallet.address)
  // console.log('usdc bal', formatUnits(bal, 6))
  //
  // const { tx: txn } = (await hl.deposit(tokens.USDC, FixedNumber.fromString(formatUnits(bal, 6))))[0] as UnsignedTransactionWithMetadata
  //
  // const txData = await wallet.populateTransaction({ to: txn.to, data: txn.data })
  // const tx = await wallet.signTransaction(txData)
  // const response = await provider.sendTransaction(tx)
  //
  // console.log(response)

  // ** WITHDRAW ** //

  // const account = await hl.getAccountInfo(wallet.address)
  // console.log(account)
  //
  // const apiReq = (await hl.withdraw(tokens.USDC, account.withdrawable, wallet))[0]
  //
  // if (isPopulatedTransaction(apiReq)) return
  //
  // const response = await (await fetch(...apiReq.apiArgs)).json()
  // console.log(response)

  // ** CREATE & APPROVE AGENT ** //

  // const agentWallet = Wallet.createRandom()
  // console.log(agentWallet.privateKey)
  //
  // const apiReq = await approveAgent(wallet, agentWallet.address)
  //
  // const responseAgent = await (await fetch(...apiReq)).json()
  // console.log(responseAgent)

  // ** CREATE ORDER ** //

  // const apiReqOrder = await placeOrders(
  //   walletAgent,
  //   [
  //     {
  //       coin: "ETH",
  //       is_buy: true,
  //       sz: 0.02,
  //       limit_px: 2400,
  //       cloid: null,
  //       order_type: {
  //         limit: {
  //           tif: "Gtc",
  //         }
  //       },
  //       reduce_only: false
  //     }, {
  //       coin: "ETH",
  //       is_buy: false,
  //       sz: 0.02,
  //       limit_px: 2800,
  //       cloid: null,
  //       order_type: {
  //         limit: {
  //           tif: "Gtc",
  //         }
  //       },
  //       reduce_only: false
  //     }
  //   ],
  //   await getMeta()
  // )
  // console.log(apiReqOrder)
  //
  // const response = await fetch(...apiReqOrder)
  //
  // if (response.ok) {
  //   console.dir(await response.json(), { depth: 4 })
  // } else {
  //   console.log(response)
  // }

  // ** GET ACTIVE AGENT ADDRESS ** //

  // console.dir((await getWebdata2(wallet.address)), { depth: 6 })
  // console.dir((await getExtraAgents(wallet.address)), { depth: 6 })

  // ** EDIT ORDER ** //

  // const order = (await getOpenOrders(wallet.address))[0]
  //
  // const apiReqOrder = await modifyOrders(
  //   walletAgent,
  //   [{
  //     order: {
  //       coin: "ETH",
  //       is_buy: true,
  //       sz: 0.04,
  //       limit_px: 2400,
  //       cloid: null,
  //       order_type: {
  //         limit: {
  //           tif: "Gtc",
  //         }
  //       },
  //       reduce_only: false
  //     },
  //     oid: order.oid
  //   }],
  //   await getMeta()
  // )
  // console.log(apiReqOrder)
  //
  // const response = await fetch(...apiReqOrder)
  //
  // if (response.ok) {
  //   console.dir(await response.json(), { depth: 6 })
  // } else {
  //   console.log(response)
  // }

  // ** CANCEL ORDER ** //

  // const order = (await getOpenOrders(wallet.address))
  //
  // const apiReqOrder = await cancelOrders(
  //   walletAgent,
  //   order.map((o) => { return { coin: 'ETH', oid: o.oid } }),
  //   await getMeta()
  // )
  // console.log(apiReqOrder)
  //
  // const response = await fetch(...apiReqOrder)
  //
  // if (response.ok) {
  //   console.dir(await response.json(), { depth: 6 })
  // } else {
  //   console.log(response)
  // }

  // ** CHANGE MODE / UPDATE LEVERAGE ** //

  // const apiReqOrder = await updateLeverage(walletAgent, 5, 'ETH', false, await getMeta())
  // console.log(apiReqOrder)
  //
  // const response = await fetch(...apiReqOrder)
  //
  // if (response.ok) {
  //   console.dir(await response.json(), { depth: 6 })
  // } else {
  //   console.log(response)
  // }

  // ** UPDATE ISOLATED MARGIN ** //

  // const apiReqOrder = await updateIsolatedMargin(walletAgent, -0.999, 'ETH', await getMeta())
  // console.log(apiReqOrder)
  //
  // const response = await fetch(...apiReqOrder)
  //
  // if (response.ok) {
  //   console.dir(await response.json(), { depth: 6 })
  // } else {
  //   console.log(response)
  // }

  // ** CHECK RAGE TRADE PERSISTENT AGENT ** //

  // console.log(await checkIfRageTradeAgent(wallet.address))
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const hl = new HyperliquidAdapterV1()

const wallet = createWalletClient({
  account: privateKeyToAccount('0x_INPUT_PK'),
  transport: http(),
  chain: arbitrum
})

const agentWallet = createWalletClient({
  account: privateKeyToAccount('0x_INPUT_PK'),
  transport: http(),
  chain: arbitrum
})

console.log('using wallet', wallet.account.address)
console.log('using agent wallet', agentWallet.account.address)

async function execute(executionPayload: ActionParam[]) {
  for (const payload of executionPayload) {
    if (isUnsignedTxWithMetadata(payload)) {
      const tx = await wallet.sendTransaction({
        chain: arbitrum,
        to: payload.tx.to as `0x${string}`,
        data: payload.tx.data as `0x${string}`,
        gasPrice: 100000000n
      })

      console.log(payload.heading, 'success')
      console.dir(tx, { depth: 6 })

      await sleep(2000)
      continue
    }

    if (!isRequestSignerFn(payload)) continue

    // is submitting
    const fetchPayload = await payload.fn(
      payload.isEoaSigner ? wallet : agentWallet,
      payload.isAgentRequired ? agentWallet.account.address : undefined
    )

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
      console.log(payload.heading, 'success')
      console.dir(data, { depth: 6 })
    } else {
      // failure
      console.log(payload.heading, 'failed (not ok code)')
      console.dir(res, { depth: 6 })
    }
  }
}

async function testIncreaseOrder() {
  const market = (await hl.supportedMarkets([hyperliquid])).find((m) => m.indexToken.symbol === 'ETH')!

  const orderData: CreateOrder[] = [
    {
      marketId: market.marketId,
      direction: 'SHORT',
      sizeDelta: { amount: FixedNumber.fromString('0.01'), isTokenAmount: true },
      marginDelta: { amount: FixedNumber.fromString('6.117002'), isTokenAmount: true },
      triggerData: undefined,
      collateral: HL_COLLATERAL_TOKEN,
      type: 'MARKET',
      mode: 'ISOLATED',
      slippage: undefined
    }
  ]

  const executionPayload = await hl.increasePosition(orderData, wallet.account.address)
  console.dir(executionPayload, { depth: 4 })

  await execute(executionPayload)
}

async function testUpdateOrder() {
  const market = (await hl.supportedMarkets([hyperliquid])).find((m) => m.indexToken.symbol === 'ETH')!

  const allOrders = (await hl.getAllOrders(wallet.account.address, undefined)).result
  console.dir(allOrders, { depth: 4 })

  const orderData: UpdateOrder[] = [
    {
      marketId: market.marketId,
      direction: 'LONG',
      sizeDelta: { amount: FixedNumber.fromString('0.024444444444444'), isTokenAmount: true },
      marginDelta: { amount: FixedNumber.fromString('10'), isTokenAmount: true },
      triggerData: {
        triggerPrice: FixedNumber.fromString('2400.00000001'),
        triggerAboveThreshold: true,
        triggerLimitPrice: FixedNumber.fromString('2100')
      },
      mode: 'ISOLATED',
      orderId: '7925732318',
      orderType: 'TAKE_PROFIT_LIMIT'
    },
    {
      marketId: market.marketId,
      direction: 'SHORT',
      sizeDelta: { amount: FixedNumber.fromString('0.024444444444444'), isTokenAmount: true },
      marginDelta: { amount: FixedNumber.fromString('10'), isTokenAmount: true },
      triggerData: {
        triggerPrice: FixedNumber.fromString('2600.00000001'),
        triggerAboveThreshold: true,
        triggerLimitPrice: FixedNumber.fromString('2100')
      },
      mode: 'ISOLATED',
      orderId: '7925732319',
      orderType: 'STOP_LOSS_LIMIT'
    }
  ]

  const executionPayload = await hl.updateOrder(orderData, wallet.account.address)
  console.dir(executionPayload, { depth: 4 })

  await execute(executionPayload)
}

async function testCancelOrder() {
  const allOrders = (await hl.getAllOrders(wallet.account.address, undefined)).result
  console.dir(allOrders, { depth: 4 })

  const orderData: CancelOrder[] = allOrders.map((o) => {
    return { marketId: o.marketId, orderId: o.orderId, type: o.orderType }
  })

  const executionPayload = await hl.cancelOrder(orderData, wallet.account.address)
  console.dir(executionPayload, { depth: 4 })

  await execute(executionPayload)
}

async function testUpdateMargin() {
  const allPositions = (await hl.getAllPositions(wallet.account.address, undefined)).result
  console.dir(allPositions, { depth: 4 })

  const positionData: PositionInfo = allPositions.find((p) => p.indexToken.symbol === 'ETH')!

  const updateData: UpdatePositionMarginData = {
    isDeposit: false,
    collateral: HL_COLLATERAL_TOKEN,
    margin: {
      isTokenAmount: true,
      amount: FixedNumber.fromString('4')
    }
  }

  const executionPayload = await hl.updatePositionMargin([positionData], [updateData], wallet.account.address)
  console.dir(executionPayload, { depth: 4 })

  await execute(executionPayload)
}

async function testClosePosition() {
  const allPositions = (await hl.getAllPositions(wallet.account.address, undefined)).result
  console.dir(allPositions, { depth: 4 })

  const positionData: PositionInfo = allPositions.find((p) => p.indexToken.symbol === 'ETH')!

  const orderData: ClosePositionData[] = [
    {
      closeSize: { amount: FixedNumber.fromString('0.0222222222222222'), isTokenAmount: true },
      triggerData: undefined,
      type: 'MARKET',
      // triggerData: {
      //   triggerPrice: FixedNumber.fromString('2000.00000001'),
      //   triggerAboveThreshold: true,
      //   triggerLimitPrice: FixedNumber.fromString('2200.00000001'),
      // },
      // type: 'STOP_LOSS',
      // type: 'TAKE_PROFIT',
      // type: 'STOP_LOSS_LIMIT',
      // type: 'TAKE_PROFIT_LIMIT',
      outputCollateral: undefined
    }
  ]

  const executionPayload = await hl.closePosition([positionData], orderData, wallet.account.address)
  console.dir(executionPayload, { depth: 4 })

  await execute(executionPayload)
}

async function testAuthenticateAgent() {
  console.log(
    await hl.authenticateAgent(
      [
        {
          agentAddress: ethers.constants.AddressZero,
          protocolId: 'HL'
        }
      ],
      wallet.account.address
    )
  )
}

async function testSetReferralCode() {
  const params = await setReferralCode()
  await execute([params])
}

async function testPoints() {
  const data = await getPoints(wallet.account.address, agentWallet)
  console.dir(data, { depth: 6 })
}

// testIncreaseOrder()
// testUpdateOrder()
// testCancelOrder()
// testUpdateMargin()
// testClosePosition()
// testAuthenticateAgent()
// testSetReferralCode()
// testPoints()
