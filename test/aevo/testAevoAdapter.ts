import { config } from 'dotenv'
import AevoAdapterV1 from '../../src/exchanges/aevo'
import { ApiOpts } from '../../src/interfaces/V1/IRouterAdapterBaseV1'

const aa = new AevoAdapterV1()

const btcMarketId = '42161-AEVO-BTC'
const ethMarketId = '42161-AEVO-ETH'

config()

const AEVO_KEY = process.env.AEVO_KEY
const SECRET = process.env.SECRET

const aevoPrivateOpts: ApiOpts = {
  bypassCache: false,
  aevoAuth: {
    apiKey: AEVO_KEY!,
    secret: SECRET!
  }
}

async function supportedMarkets() {
  const markets = await aa.supportedMarkets(aa.supportedChains())
  console.dir(markets, { depth: 4 })
}

async function getMarketPrices() {
  const prices = await aa.getMarketPrices([btcMarketId, ethMarketId])
  console.dir(prices, { depth: 4 })
}

async function getMarketsInfo() {
  const info = await aa.getMarketsInfo([btcMarketId, ethMarketId])
  console.dir(info, { depth: 4 })
}

async function getDynamicMarketMetadata() {
  // await aa.setup()
  // const metadata1 = await aa.getDynamicMarketMetadata([btcMarketId /* , ethMarketId */])
  // console.dir(metadata1, { depth: 4 })
  // await delay(2500)
  const metadata = await aa.getDynamicMarketMetadata([btcMarketId /* , ethMarketId */])
  console.dir(metadata, { depth: 4 })
}

async function getAllPositions() {
  const positions = (await aa.getAllPositions('', undefined, aevoPrivateOpts)).result
  console.dir(positions, { depth: 4 })
}

async function getAllOrders() {
  const orders = (await aa.getAllOrders('', undefined, aevoPrivateOpts)).result
  console.dir(orders, { depth: 4 })
}

aa.init(undefined).then(() => {
  delay(2500).then(() => {
    getAllOrders()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error)
        process.exit(1)
      })
  })
})

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
