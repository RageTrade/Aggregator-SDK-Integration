import AevoAdapterV1 from '../../src/exchanges/aevo'

const aa = new AevoAdapterV1()

const btcMarketId = '42161-AEVO-BTC'
const ethMarketId = '42161-AEVO-ETH'

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

getDynamicMarketMetadata()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
