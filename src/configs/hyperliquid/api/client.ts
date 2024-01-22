import { getAddress } from 'ethers-v6'
import { HL_EXCHANGE_URL, HL_INFO_URL } from './config'
import {
  ActiveAssetData,
  AllMids,
  CancelRequest,
  ClearinghouseState,
  FundingHistory,
  Grouping,
  L2Book,
  Meta,
  MetaAndAssetCtx,
  ModifyRequest,
  ModifySpec,
  OpenOrders,
  OrderRequest,
  OrderSpec,
  OrderStatusInfo,
  OrderType,
  OrderTypeWire,
  OrderWire,
  UserFill,
  UserFunding
} from './types'
import { Token } from '../../../common/tokens'
import { Wallet, ethers } from 'ethers'
import { signAgent, signL1Action, signWithdrawFromBridgeAction } from './signing'
import { RequestSignerFnWithMetadata } from '../../../interfaces/IActionExecutor'

const BASE_TYPE_WITH_CLOID = ethers.utils.ParamType.from('(uint32,bool,uint64,uint64,bool,uint8,uint64,bytes16)[]')
const BASE_TYPE_WITHOUT_CLOID = ethers.utils.ParamType.from('(uint32,bool,uint64,uint64,bool,uint8,uint64)[]')

export const HL_TOKENS_MAP: Record<
  string,
  Token & {
    assetIndex: number // To be used in some api's
  }
> = {}
export const HL_COLLATERAL_TOKEN = {
  symbol: 'USD',
  name: 'USD',
  decimals: 18,
  address: {
    42161: undefined,
    10: undefined
  }
}

export function updateTokensMap(meta: Meta) {
  meta.universe.forEach((u, index) => {
    HL_TOKENS_MAP[u.name] = {
      symbol: u.name,
      name: u.name,
      decimals: u.szDecimals,
      address: {
        42161: undefined,
        10: undefined
      },
      assetIndex: index
    }
  })
}

async function makeRequest(url: string, reqData: string) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: reqData
  }).then((res) => {
    if (res.ok) return res.json()
    return res
  })
}

async function makeRequestExecutable(url: string, reqData: string): Promise<Parameters<typeof fetch>> {
  const params: Parameters<typeof fetch> = [
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: reqData
    }
  ]

  return params
}

export async function getMeta(): Promise<Meta> {
  const reqData = JSON.stringify({
    type: 'meta'
  })
  const meta = (await makeRequest(HL_INFO_URL, reqData)) as Meta
  updateTokensMap(meta)
  return meta
}

export async function getAllMids(): Promise<AllMids> {
  const reqData = JSON.stringify({
    type: 'allMids'
  })
  return makeRequest(HL_INFO_URL, reqData)
}

export async function getMetaAndAssetCtxs(): Promise<MetaAndAssetCtx> {
  const reqData = JSON.stringify({
    type: 'metaAndAssetCtxs'
  })
  return makeRequest(HL_INFO_URL, reqData)
}

export async function getClearinghouseState(wallet: string): Promise<ClearinghouseState> {
  const user = getAddress(wallet)
  const reqData = JSON.stringify({
    type: 'clearinghouseState',
    user: user
  })
  return makeRequest(HL_INFO_URL, reqData)
}

export async function getUserFills(wallet: string): Promise<UserFill[]> {
  const user = getAddress(wallet)
  const reqData = JSON.stringify({
    type: 'userFills',
    user: user
  })
  return makeRequest(HL_INFO_URL, reqData)
}

export async function getWebdata2(wallet: string): Promise<{ agentAddress: string }> {
  const user = getAddress(wallet)
  const reqData = JSON.stringify({
    type: 'webData2',
    user: user
  })
  return makeRequest(HL_INFO_URL, reqData)
}

export async function getExtraAgents(wallet: string): Promise<{ address: string; name: string }[]> {
  const user = getAddress(wallet)
  const reqData = JSON.stringify({
    type: 'extraAgents',
    user: user
  })
  return makeRequest(HL_INFO_URL, reqData)
}

// Number of fills is limited to 2000
export async function getUserFillsByTime(wallet: string, startTimeMs: number, endTimeMs?: number): Promise<UserFill[]> {
  const user = getAddress(wallet)
  const reqData = JSON.stringify({
    type: 'userFillsByTime',
    user: user,
    startTime: startTimeMs,
    endtime: endTimeMs
  })
  return makeRequest(HL_INFO_URL, reqData)
}

export async function getUserFunding(wallet: string, startTimeMs: number, endTimeMs?: number): Promise<UserFunding[]> {
  const user = getAddress(wallet)
  const reqData = JSON.stringify({
    type: 'userFunding',
    user: user,
    startTime: startTimeMs,
    endtime: endTimeMs
  })
  return makeRequest(HL_INFO_URL, reqData)
}

export async function getFundingHistory(
  coin: string,
  startTimeMs: number,
  endTimeMs?: number
): Promise<FundingHistory[]> {
  const reqData = JSON.stringify({
    type: 'fundingHistory',
    coin: coin,
    startTime: startTimeMs,
    endtime: endTimeMs
  })
  return makeRequest(HL_INFO_URL, reqData)
}

export async function getL2Book(coin: string, nSigFigs: number = 5): Promise<L2Book> {
  const reqData = JSON.stringify({
    type: 'l2Book',
    coin: coin,
    nSigFigs: nSigFigs
  })
  return makeRequest(HL_INFO_URL, reqData)
}

export async function getOpenOrders(wallet: string): Promise<OpenOrders[]> {
  const user = getAddress(wallet)
  const reqData = JSON.stringify({
    type: 'openOrders',
    user: user
  })
  return makeRequest(HL_INFO_URL, reqData)
}

export async function getOrderStatus(wallet: string, oid: number): Promise<OrderStatusInfo> {
  const user = getAddress(wallet)
  const reqData = JSON.stringify({
    type: 'orderStatus',
    user: user,
    oid: oid
  })
  return makeRequest(HL_INFO_URL, reqData)
}

export async function getActiveAssetData(wallet: string, assetIndex: number): Promise<ActiveAssetData> {
  const user = getAddress(wallet)
  const reqData = JSON.stringify({
    type: 'activeAssetData',
    user: user,
    asset: assetIndex
  })
  return makeRequest(HL_INFO_URL, reqData)
}

function floatToWire(x: number): string {
  const rounded: string = x.toFixed(8)
  if (Math.abs(parseFloat(rounded) - x) >= 1e-12) {
    throw new Error(`floatToWire causes rounding ${x}`)
  }
  return rounded
}

export function floatToIntForHashing(x: number): number {
  return floatToInt(x, 8)
}

export function floatToUsdInt(x: number): number {
  return floatToInt(x, 6)
}

export function floatToInt(x: number, power: number): number {
  const withDecimals: number = x * Math.pow(10, power)
  if (Math.abs(Math.round(withDecimals) - withDecimals) >= 1e-3) {
    throw new Error(`floatToInt causes rounding ${x}`)
  }
  const res: number = Math.round(withDecimals)
  return res
}

export function slippagePrice(isBuy: boolean, slippage: number, px: number): number {
  // Calculate Slippage
  px *= isBuy ? 1 + slippage : 1 - slippage

  // We round px to 5 significant figures and 6 decimals
  return parseFloat(px.toFixed(6))
}

export function orderTypeToTuple(orderType: OrderType): [number, number] {
  if (orderType.limit !== undefined) {
    const tif = orderType.limit.tif
    if (tif === 'Gtc') {
      return [2, 0]
    } else if (tif === 'Alo') {
      return [1, 0]
    } else if (tif === 'Ioc') {
      return [3, 0]
    }
  } else if (orderType.trigger !== undefined) {
    const trigger = orderType.trigger
    const triggerPx = trigger.triggerPx
    if (trigger.isMarket && trigger.tpsl === 'tp') {
      return [4, triggerPx]
    } else if (!trigger.isMarket && trigger.tpsl === 'tp') {
      return [5, triggerPx]
    } else if (trigger.isMarket && trigger.tpsl === 'sl') {
      return [6, triggerPx]
    } else if (!trigger.isMarket && trigger.tpsl === 'sl') {
      return [7, triggerPx]
    }
  }

  throw new Error('Invalid order type')
}

function orderGroupingToNumber(grouping: Grouping): number {
  switch (grouping) {
    case 'na':
      return 0
    case 'normalTpsl':
      return 1
    case 'positionTpsl':
      return 2
    default:
      throw new Error('Invalid grouping')
  }
}

function orderTypeToWire(orderType: OrderType): OrderTypeWire {
  if (orderType.limit !== undefined) {
    return { limit: orderType.limit }
  } else if (orderType.trigger !== undefined) {
    const { triggerPx, tpsl, isMarket } = orderType.trigger
    return {
      trigger: {
        triggerPx: floatToWire(triggerPx),
        tpsl,
        isMarket
      }
    }
  }
  throw new Error('Invalid order type')
}

export function orderRequestToOrderSpec(order: OrderRequest, asset: number): OrderSpec {
  let cloid: any = null

  if (order.cloid) cloid = order.cloid

  return {
    order: {
      asset: asset,
      isBuy: order.is_buy,
      reduceOnly: order.reduce_only,
      limitPx: order.limit_px,
      sz: order.sz,
      cloid: cloid
    },
    orderType: order.order_type
  }
}

export function orderSpecPreprocessing(each: OrderSpec): any[] {
  const result = []

  const orderTypeTuple = orderTypeToTuple(each.orderType)

  result.push(each.order.asset)
  result.push(each.order.isBuy)

  result.push(floatToIntForHashing(each.order.limitPx))
  result.push(floatToIntForHashing(each.order.sz))

  result.push(each.order.reduceOnly)

  result.push(orderTypeTuple[0])
  result.push(floatToIntForHashing(orderTypeTuple[1]))

  return result
}

export function orderSpecToOrderWire(order: OrderSpec): OrderWire {
  return {
    asset: order.order.asset,
    isBuy: order.order.isBuy,
    limitPx: floatToWire(order.order.limitPx),
    sz: order.order.sz.toString(),
    reduceOnly: order.order.reduceOnly,
    orderType: orderTypeToWire(order.orderType),
    cloid: order.order.cloid
  }
}

function modifySpecPreprocessing(modifySpec: ModifySpec): any[] {
  const res: any[] = [modifySpec.oid, ...orderSpecPreprocessing(modifySpec.order)]

  const order = modifySpec.order.order
  if (!order.cloid) res.push(ethers.utils.hexZeroPad(ethers.utils.hexValue(0), 16))

  return res
}

export function coinToAsset(coin: string, meta: Meta): number {
  return meta.universe.findIndex((e) => e.name === coin)
}

export async function checkIfRageTradeAgent(wallet: string, expectedAgentAddress?: string) {
  const agents = await getExtraAgents(wallet)

  for (const agent of agents) {
    if (agent.name === 'rage_trade') {
      if (expectedAgentAddress) return getAddress(expectedAgentAddress) === agent.address
      return true
    }
  }

  return false
}

export async function withdrawFromBridge(wallet: Wallet, amount: string) {
  const timestamp = Math.floor(new Date().getTime())

  const payload = {
    destination: wallet.address,
    usd: amount,
    time: timestamp
  }

  const signature = (await signWithdrawFromBridgeAction(wallet, payload)).slice(2)

  const rawSignature = {
    r: '0x' + signature.slice(0, 64),
    s: '0x' + signature.slice(64, 128),
    v: parseInt(signature.slice(128), 16)
  }

  const reqData = JSON.stringify({
    action: {
      chain: 'Arbitrum',
      payload: payload,
      type: 'withdraw2'
    },
    nonce: timestamp,
    signature: rawSignature
  })

  return makeRequestExecutable(HL_EXCHANGE_URL, reqData)
}

export async function approveAgent(): Promise<RequestSignerFnWithMetadata> {
  const agentWalletSigner = ethers.Wallet.createRandom()
  const agentWallet = agentWalletSigner.address

  const timestamp = Math.floor(new Date().getTime())
  const connectionId = ethers.utils.solidityKeccak256(
    ['address'],
    [ethers.utils.defaultAbiCoder.encode(['address', 'string'], [agentWallet, 'rage_trade'])]
  )

  const agentData = {
    source: 'https://hyperliquid.xyz',
    connectionId: connectionId
  }

  return {
    fn: async (wallet: Wallet) => {
      const signature = (await signAgent(wallet, agentData)).slice(2)

      const rawSignature = {
        r: '0x' + signature.slice(0, 64),
        s: '0x' + signature.slice(64, 128),
        v: parseInt(signature.slice(128), 16)
      }

      const reqData = JSON.stringify({
        action: {
          chain: 'Arbitrum',
          agent: agentData,
          agentAddress: agentWallet,
          extraAgentName: 'rage_trade',
          type: 'connect'
        },
        nonce: timestamp,
        signature: rawSignature
      })

      return makeRequestExecutable(HL_EXCHANGE_URL, reqData)
    },
    isEoaSigner: true,
    desc: 'Approve Agent',
    chainId: 1337,
    heading: 'Approve Agent',
    pk: agentWalletSigner.privateKey
  }
}

export async function placeOrders(orders: OrderRequest[], meta: Meta): Promise<RequestSignerFnWithMetadata> {
  const timestamp = Math.floor(new Date().getTime())

  const orderSpecs: OrderSpec[] = []

  let hasCloid = false

  for (const each of orders) {
    if (each.cloid) hasCloid = true
    const asset = coinToAsset(each.coin, meta)
    orderSpecs.push(orderRequestToOrderSpec(each, asset))
  }

  if (hasCloid) {
    for (const each of orderSpecs) {
      if (!each.order.cloid) {
        throw new Error('all orders must have cloids if at least one has a cloid')
      }
    }
  }

  let signatureTypes: ethers.utils.ParamType[] = []

  hasCloid
    ? (signatureTypes = [BASE_TYPE_WITH_CLOID, ethers.utils.ParamType.from('uint8')])
    : (signatureTypes = [BASE_TYPE_WITHOUT_CLOID, ethers.utils.ParamType.from('uint8')])

  const processedOrderSpecs: any[] = []

  for (const each of orderSpecs) {
    processedOrderSpecs.push(orderSpecPreprocessing(each))
  }

  return {
    fn: async (wallet: Wallet) => {
      const signature = (
        await signL1Action(wallet, signatureTypes, [processedOrderSpecs, orderGroupingToNumber('na')], timestamp)
      ).slice(2)

      const rawSignature = {
        r: '0x' + signature.slice(0, 64),
        s: '0x' + signature.slice(64, 128),
        v: parseInt(signature.slice(128), 16)
      }

      const wireOrders: OrderWire[] = []

      for (const each of orderSpecs) {
        wireOrders.push(orderSpecToOrderWire(each))
      }

      const reqData = JSON.stringify({
        action: {
          type: 'order',
          grouping: 'na',
          orders: wireOrders
        },
        nonce: timestamp,
        signature: rawSignature
      })

      return makeRequestExecutable(HL_EXCHANGE_URL, reqData)
    },
    isEoaSigner: false,
    desc: 'Place Orders',
    chainId: 1337,
    heading: 'Place Orders'
  }
}

export async function cancelOrders(orders: CancelRequest[], meta: Meta) {
  const timestamp = Math.floor(new Date().getTime())

  const processedOrderSpecs: any[] = []

  const signatureTypes = [ethers.utils.ParamType.from('(uint32,uint64)[]')]

  for (const each of orders) {
    const result = []

    result.push(coinToAsset(each.coin, meta))
    result.push(each.oid)

    processedOrderSpecs.push(result)
  }

  return {
    fn: async (wallet: Wallet) => {
      const signature = (await signL1Action(wallet, signatureTypes, [processedOrderSpecs], timestamp)).slice(2)

      const rawSignature = {
        r: '0x' + signature.slice(0, 64),
        s: '0x' + signature.slice(64, 128),
        v: parseInt(signature.slice(128), 16)
      }

      const wireOrders: { asset: number; oid: number }[] = processedOrderSpecs.map((v) => {
        return { asset: v[0], oid: v[1] }
      })

      const reqData = JSON.stringify({
        action: {
          type: 'cancel',
          cancels: wireOrders
        },
        nonce: timestamp,
        signature: rawSignature
      })

      return makeRequestExecutable(HL_EXCHANGE_URL, reqData)
    },
    isEoaSigner: false,
    desc: 'Cancel Orders',
    chainId: 1337,
    heading: 'Cancel Orders'
  }
}

export async function modifyOrders(orders: ModifyRequest[], meta: Meta) {
  const timestamp = Math.floor(new Date().getTime())

  const signatureTypes = [ethers.utils.ParamType.from('(uint64,uint32,bool,uint64,uint64,bool,uint8,uint64,bytes16)[]')]

  const orderSpecs: ModifySpec[] = []

  for (const each of orders) {
    orderSpecs.push({
      oid: each.oid,
      order: orderRequestToOrderSpec(each.order, coinToAsset(each.order.coin, meta)),
      orderType: each.order.order_type
    })
  }

  const processedOrderSpecs: any[] = []

  for (const each of orderSpecs) {
    processedOrderSpecs.push(modifySpecPreprocessing(each))
  }

  return {
    fn: async (wallet: Wallet) => {
      const signature = (await signL1Action(wallet, signatureTypes, [processedOrderSpecs], timestamp, 40)).slice(2)

      const rawSignature = {
        r: '0x' + signature.slice(0, 64),
        s: '0x' + signature.slice(64, 128),
        v: parseInt(signature.slice(128), 16)
      }

      const wireOrders: { oid: number; order: OrderWire }[] = orderSpecs.map((v) => {
        return { oid: v.oid, order: orderSpecToOrderWire(v.order) }
      })

      const reqData = JSON.stringify({
        action: {
          type: 'batchModify',
          modifies: wireOrders
        },
        nonce: timestamp,
        signature: rawSignature
      })

      return makeRequestExecutable(HL_EXCHANGE_URL, reqData)
    },
    isEoaSigner: false,
    desc: 'Place Orders',
    chainId: 1337,
    heading: 'Place Orders'
  }
}

export async function updateLeverage(leverage: number, coin: string, is_cross: boolean, meta: Meta) {
  const timestamp = Math.floor(new Date().getTime())
  const asset = coinToAsset(coin, meta)

  const signatureTypes = [
    ethers.utils.ParamType.from('uint32'),
    ethers.utils.ParamType.from('bool'),
    ethers.utils.ParamType.from('uint32')
  ]

  return {
    fn: async (wallet: Wallet) => {
      const signature = (await signL1Action(wallet, signatureTypes, [asset, is_cross, leverage], timestamp)).slice(2)

      const rawSignature = {
        r: '0x' + signature.slice(0, 64),
        s: '0x' + signature.slice(64, 128),
        v: parseInt(signature.slice(128), 16)
      }

      const reqData = JSON.stringify({
        action: {
          type: 'updateLeverage',
          asset,
          isCross: is_cross,
          leverage
        },
        nonce: timestamp,
        signature: rawSignature
      })

      return makeRequestExecutable(HL_EXCHANGE_URL, reqData)
    },
    isEoaSigner: false,
    desc: 'Place Orders',
    chainId: 1337,
    heading: 'Place Orders'
  }
}

export async function updateIsolatedMargin(amount: number, coin: string, meta: Meta) {
  const timestamp = Math.floor(new Date().getTime())
  const asset = coinToAsset(coin, meta)

  const amountInt = floatToUsdInt(amount)

  const signatureTypes = [
    ethers.utils.ParamType.from('uint32'),
    ethers.utils.ParamType.from('bool'),
    ethers.utils.ParamType.from('int64')
  ]

  return {
    fn: async (wallet: Wallet) => {
      const signature = (await signL1Action(wallet, signatureTypes, [asset, true, amountInt], timestamp)).slice(2)

      const rawSignature = {
        r: '0x' + signature.slice(0, 64),
        s: '0x' + signature.slice(64, 128),
        v: parseInt(signature.slice(128), 16)
      }

      const reqData = JSON.stringify({
        action: {
          type: 'updateIsolatedMargin',
          asset,
          isBuy: true,
          ntli: amountInt
        },
        nonce: timestamp,
        signature: rawSignature
      })

      return makeRequestExecutable(HL_EXCHANGE_URL, reqData)
    },
    isEoaSigner: false,
    desc: 'Place Orders',
    chainId: 1337,
    heading: 'Place Orders'
  }
}
