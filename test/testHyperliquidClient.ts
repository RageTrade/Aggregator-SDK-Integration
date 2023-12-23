import { BigNumber } from 'ethers'
import {
  getAllMids,
  getClearinghouseState,
  getFundingHistory,
  getL2Book,
  getMeta,
  getMetaAndAssetCtxs,
  getOpenOrders,
  getOrderStatus,
  getUserFills,
  getUserFillsByTime,
  getUserFunding
} from '../src/configs/hyperliquid/api/client'
import { Token } from '../src/common/tokens'

const normalAddress = '0x2f88a09ed4174750a464576FE49E586F90A34820'
const w = normalAddress

async function meta() {
  const meta = await getMeta()
  console.log(meta)
}

async function allMids() {
  const allMids = await getAllMids()
  console.log(allMids)
}

async function metaAndAssetCtxs() {
  const metaAndAssetCtxs = await getMetaAndAssetCtxs()
  console.log(metaAndAssetCtxs)
}

async function clearinghouseState() {
  const clearinghouseState = await getClearinghouseState(w)
  console.dir(clearinghouseState, { depth: 4 })
}

async function openOrders() {
  const openOrders = await getOpenOrders(w)
  console.dir(openOrders, { depth: 4 })
}

async function userFills() {
  const userFills = await getUserFills(w)
  console.dir(userFills, { depth: 4 })
}

async function userFillsByTime() {
  const userFills = await getUserFillsByTime(w, 1701925640407 /* , 1701925690309 */)
  console.dir(userFills, { depth: 4 })
}

async function userFunding() {
  const userFunding = await getUserFunding(w, 1701928800056, 1701932400248)
  console.dir(userFunding, { depth: 4 })
}

async function fundingHistory() {
  const fundingHistory = await getFundingHistory('ETH', 1701928800056, 1701932400248)
  console.dir(fundingHistory, { depth: 4 })
}

async function l2Book() {
  const l2Book = await getL2Book('ETH')
  console.dir(l2Book, { depth: 4 })
}

async function orderStatus() {
  const orderStatus = await getOrderStatus(w, 4653919675)
  console.dir(orderStatus, { depth: 4 })
}

async function generateTokens() {
  const tokens: Token[] = []
  const meta = await getMeta()
  meta.universe.forEach((u) => {
    tokens.push({
      symbol: u.name,
      name: u.name,
      decimals: u.szDecimals,
      address: {
        42161: undefined,
        10: undefined
      }
    })
  })
  const tokenMap: Record<string, Token> = {}
  tokens.forEach((t) => {
    tokenMap[t.symbol] = t
  })
  console.log(tokenMap)
}

generateTokens()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
