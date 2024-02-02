import WebSocket from 'ws'
import { HL_WSS_URL } from './config'
import { L2Book } from './types'
import { FixedNumber, divFN, mulFN, subFN } from '../../../common/fixedNumber'
import { OBData } from '../../../interfaces/V1/IRouterAdapterBaseV1'
import { hlMapLevelsToOBLevels, calcHlMaxSigFigData } from '../helper'

let ws = new WebSocket(HL_WSS_URL)

// flag to check if connection is open
let isConnectionOpen = false

type L2BookWithActualPrecision = {
  book: L2Book
  precision: FixedNumber
}

// coin => precision => L2BookWithActualPrecision
const cachedBooks: Record<string, Record<number, L2BookWithActualPrecision>> = {}

ws.on('message', (data: string) => {
  const res = JSON.parse(data)

  if (res['channel'] && res['channel'] == 'l2Book') {
    const l2Book: L2Book = res['data']
    processBookRes(l2Book)
  }
})

ws.on('error', (err) => {
  isConnectionOpen = false
  console.log('HL wss error: ', err)
})

ws.on('close', () => {
  isConnectionOpen = false
})

export function hlGetCachedOrderBook(coin: string, precision: number): OBData | undefined {
  const preBook = cachedBooks[coin]
  if (!preBook) return undefined
  const l2BookWithPrecision = preBook[precision]
  if (!l2BookWithPrecision) return undefined

  const bids = hlMapLevelsToOBLevels(l2BookWithPrecision.book.levels[0])
  const asks = hlMapLevelsToOBLevels(l2BookWithPrecision.book.levels[1])

  const spread = subFN(asks[0].price, bids[0].price)
  const spreadPercent = mulFN(divFN(spread, asks[0].price), FixedNumber.fromString('100'))

  const obData: OBData = {
    actualPrecision: l2BookWithPrecision.precision,
    bids: bids,
    asks: asks,
    spread: spread,
    spreadPercent: spreadPercent
  }

  return obData
}

export function openHLWssConnection() {
  if (isConnectionOpen) return

  ws.on('open', () => {
    isConnectionOpen = true
    console.log('HL wss connected')
  })
}

export function subscribeOrderBook(coin: string, precision: number | undefined) {
  // reopen connection if for some reason it is closed
  if (!isConnectionOpen) ws = new WebSocket(HL_WSS_URL)

  if (precision) {
    const msg = getSubscribeMsg(coin, precision)
    // console.log('subMsg:', msg)
    ws.send(msg)
  } else {
    // subscribe to all precisions
    for (let i = 1; i <= 4; i++) {
      const msg = getSubscribeMsg(coin, i)
      // console.log('subMsg:', msg)
      ws.send(msg)
    }
  }
}

export function unsubscribeOrderBook(coin: string, precision: number | undefined) {
  if (precision) {
    const msg = getUnsubscribeMsg(coin, precision)
    // console.log('unsubMsg:', msg)
    ws.send(msg)
  } else {
    // unsubscribe to all precisions
    for (let i = 1; i <= 4; i++) {
      const msg = getUnsubscribeMsg(coin, i)
      // console.log('unsubMsg:', msg)
      ws.send(msg)
    }
  }
}

function getSubscribeMsg(coin: string, precision: number): string {
  return JSON.stringify({
    method: 'subscribe',
    subscription: { type: 'l2Book', coin: coin, nSigFigs: precision + 1 }
  })
}

function getUnsubscribeMsg(coin: string, precision: number): string {
  return JSON.stringify({
    method: 'unsubscribe',
    subscription: { type: 'l2Book', coin: coin, nSigFigs: precision + 1 }
  })
}

function processBookRes(l2Book: L2Book) {
  const coin = l2Book.coin
  // console.dir({ book: l2Book }, { depth: 4 })

  if (cachedBooks[coin] == undefined) cachedBooks[coin] = {}

  const { maxSigFigs, maxSigFigPrice, actualPrecision } = calcHlMaxSigFigData(l2Book)
  if (maxSigFigs < 2 || maxSigFigs > 5) throw new Error(`maxSigFigs: ${maxSigFigs} Out of bounds`)

  const l2BookWithActualPrecision: L2BookWithActualPrecision = {
    book: l2Book,
    precision: FixedNumber.fromString(actualPrecision.toString())
  }

  cachedBooks[coin][maxSigFigs - 1] = l2BookWithActualPrecision

  if (maxSigFigPrice.toString().includes('.')) {
    const decimalPart = maxSigFigPrice.toString().split('.')[1]
    if (decimalPart.length == 6 && Number(decimalPart) > 0) {
      // maximum decimal part length is 6 thus it cannot have more precision than this
      for (let i = maxSigFigs; i <= 4; i++) {
        // console.log('prepopulating precision: ', i)
        cachedBooks[coin][i] = l2BookWithActualPrecision
      }
    }
  }
}
