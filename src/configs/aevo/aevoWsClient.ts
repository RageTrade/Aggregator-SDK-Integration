import WebSocket from 'isomorphic-ws'
import { clearInterval } from 'timers'
import { aevoMarketIdToAsset } from './helper'
import { AevoClient } from '../../../generated/aevo'
import { aevoCacheGetAllMarkets } from './aevoCacheHelper'
import { CACHE_DAY } from '../../common/cache'

const aevoClient = new AevoClient()
const publicApi = aevoClient.publicApi

const AEVO_WS_URL = 'wss://ws.aevo.xyz'

// Ping interval for the websocket to keep the connection alive
const PING_INTERVAL = 10 * 60 * 1000 // 10 minutes

// flag to check if the connection is open already
let isConnectionOpen = false
let ws: WebSocket | undefined = undefined

export type AevoWssTicker = {
  instrument_id: string
  instrument_name: string
  instrument_type: string
  index_price: string
  mark: {
    price: string
  }
  open_interest: string
  bid: {
    price: string
    amount: string
  }
  ask: {
    price: string
    amount: string
  }
  funding_rate: string
}

export type AevoWssOrderBook = Awaited<ReturnType<(typeof AevoClient)['prototype']['publicApi']['getOrderbook']>>

const aevoTickerMap: Record<string, AevoWssTicker> = {}
const aevoOrderBookMap: Record<string, AevoWssOrderBook> = {}

export async function openAevoWssConnection() {
  if (isConnectionOpen) return
  isConnectionOpen = true

  ws = new WebSocket(AEVO_WS_URL)

  const intervalId = setInterval(() => {
    if (ws) ws.send(getPingMsg())
  }, PING_INTERVAL)

  ws.onopen = async function open() {
    // console.log(`Aevo wss connection opened`)

    // subscribe to all tickers
    // @dev: this takes about 2.5secs to complete
    ws!.send(await getSubTickersMsg())
  }

  ws.onmessage = function incoming(data) {
    const res = JSON.parse(data.data as string)
    processRes(res)
  }

  ws.onerror = function error() {
    // console.log(`Aevo wss connection error`)
    isConnectionOpen = false
    try {
      clearInterval(intervalId)
    } catch (_) {}
  }

  ws.onclose = function close() {
    // console.log(`Aevo wss connection closed`)
    isConnectionOpen = false
    try {
      clearInterval(intervalId)
    } catch (_) {}
  }
}

export function closeAevoWssConnection() {
  if (ws) ws.close()
  isConnectionOpen = false
}

function processRes(res: any) {
  if (res['channel'] && res['channel'].includes('ticker')) {
    processTickerResponse(res)
  }
  if (res['channel'] && res['channel'].includes('orderbook')) {
    processOBResponse(res)
  }
}

function getPingMsg() {
  return JSON.stringify({
    op: 'ping'
  })
}

//// ORDERBOOK RELATED FUNCTIONS ////
export function aevoSubscribeOrderBook(marketId: string, precision: number | undefined) {
  const asset = aevoMarketIdToAsset(marketId)
  if (!asset) return

  if (ws) ws.send(getSubOBMsg(asset, precision))
}

export function aevoUnsubscribeOrderBook(marketId: string, precision: number | undefined) {
  const asset = aevoMarketIdToAsset(marketId)
  if (!asset) return

  if (ws) ws.send(getUnsubOBMsg(asset, precision))
}

export function getAevoWssOrderBook(asset: string): AevoWssOrderBook | undefined {
  return aevoOrderBookMap[asset]
}

function getSubOBMsg(asset: string, precision: number | undefined): string {
  return JSON.stringify({
    op: 'subscribe',
    data: [`orderbook:${asset}-PERP`]
  })
}

function getUnsubOBMsg(asset: string, precision: number | undefined): string {
  return JSON.stringify({
    op: 'unsubscribe',
    data: [`orderbook:${asset}-PERP`]
  })
}

function processOBResponse(res: any) {
  const data = res['data']
  const asset = _obChannelToAsset(res['channel'])
  const orderBook = data as AevoWssOrderBook
  if (orderBook.type === 'snapshot') {
    aevoOrderBookMap[asset] = orderBook
  }
}

//// TICKER RELATED FUNCTIONS ////

export function getAevoWssTicker(asset: string): AevoWssTicker | undefined {
  return aevoTickerMap[asset]
}

async function getSubTickersMsg(): Promise<string> {
  return aevoCacheGetAllMarkets(publicApi, CACHE_DAY, CACHE_DAY).then((allMarkets) => {
    let assets = allMarkets.map((m) => m.underlying_asset)

    const data = assets.map((a) => `ticker:${a}:PERPETUAL`)

    return JSON.stringify({
      op: 'subscribe',
      data: data
    })
  })
}

function processTickerResponse(res: any) {
  const data = res['data']
  const asset = _tickerChannelToAsset(res['channel'])
  const tickers = data['tickers'] as AevoWssTicker[]
  tickers.forEach((t) => {
    aevoTickerMap[asset] = t
  })
  //   console.log('tickers:', tickers)
}

////// Internal helper functions //////
function _tickerChannelToAsset(channel: string): string {
  return channel.split(':')[1]
}

function _obChannelToAsset(channel: string): string {
  return channel.split(':')[1].split('-')[0]
}
