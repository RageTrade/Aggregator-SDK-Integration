import {
  getAevoWssOrderBook,
  getAevoWssTicker,
  openAevoWssConnection,
  aevoSubscribeOrderBook
} from '../../src/configs/aevo/aevoWsClient'
import { aevoCacheGetAllMarkets } from '../../src/configs/aevo/aevoCacheHelper'
import { AevoClient } from '../../generated/aevo'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const aevoClient = new AevoClient()
const publicApi = aevoClient.publicApi

const btcMarketId = '42161-AEVO-BTC'
const ethMarketId = '42161-AEVO-ETH'

async function tickerResponse() {
  await openAevoWssConnection()

  await delay(2000)

  const ticker = getAevoWssTicker('BTC')
  console.log(ticker)
}

async function obResponse() {
  openAevoWssConnection()
  await delay(1000)

  aevoSubscribeOrderBook(btcMarketId, undefined)
  await delay(1000)

  const OB = getAevoWssOrderBook('BTC')
  console.log(OB)
}

tickerResponse()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
