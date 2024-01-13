import { getAddress } from 'ethers-v6'
import { HL_BASE_URL, HL_EXCHANGE_URL, HL_INFO_URL } from './config'
import {
  ActiveAssetData,
  AllMids,
  ClearinghouseState,
  FundingHistory,
  L2Book,
  Meta,
  MetaAndAssetCtx,
  OpenOrders,
  OrderStatusInfo,
  UserFill,
  UserFunding
} from './types'
import { Token } from '../../../common/tokens'
import { BigNumber, Wallet } from 'ethers'
import { signWithdrawFromBridgeAction } from './signing'
import { parseUnits } from 'ethers/lib/utils'

const TWO_USDC = parseUnits("2", 6)

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
  })
    .then((res) => {
      if (res.ok) return res.json()
      return res
    })
}

async function makeRequestExecutable(url: string, reqData: string) {
  const params = [url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: reqData
  }]

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

export async function withdrawFromBridge(wallet: Wallet, amount: string) {
  console.log('using eoa', wallet.address)
  const timestamp = Math.floor((new Date()).getTime());

  const payload = {
    destination: wallet.address,
    usd: amount,
    time: timestamp,
  }

  const signature = (await signWithdrawFromBridgeAction(wallet, payload, true)).slice(2)

  const rawSignature = {
    r: "0x" + signature.slice(0, 64),
    s: "0x" + signature.slice(64, 128),
    v: parseInt(signature.slice(128), 16)
  }

  const reqData = JSON.stringify({
    action: {
      chain: "Arbitrum",
      payload: payload,
      type: "withdraw2"
    },
    nonce: timestamp,
    signature: rawSignature,
  })

  console.log(reqData)
  console.log(await makeRequest(HL_EXCHANGE_URL, reqData))
}
