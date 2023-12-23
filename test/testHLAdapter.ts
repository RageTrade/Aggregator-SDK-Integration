import HyperliquidAdapterV1 from '../src/exchanges/hyperliquid'

const normalAddress = '0x2f88a09ed4174750a464576FE49E586F90A34820'
const liquidatedAddress = '0x2f88a09ed4174750a464576FE49E586F90A34820'
const w = normalAddress

const hl = new HyperliquidAdapterV1()

const ethMarketId = '9999998-HL-ETH'
const btcMarketId = '9999998-HL-BTC'
const ntrnMarketId = '9999998-HL-NTRN'
const kPepeMarketId = '9999998-HL-kPEPE'

async function supportedMarkets() {
  const markets = await hl.supportedMarkets(hl.supportedChains())
  //   console.dir(markets, { depth: 2 })
  markets.forEach((m) => {
    console.log(m.marketId)
  })
}

async function getMarketsInfo() {
  const marketInfo = await hl.getMarketsInfo([ethMarketId, btcMarketId, ntrnMarketId], undefined)
  console.dir(marketInfo, { depth: 2 })
}

async function getMarketPrices() {
  const markets = await hl.supportedMarkets(hl.supportedChains())
  const prices = await hl.getMarketPrices(
    markets.map((m) => m.marketId),
    undefined
  )
  console.log(prices)
}

async function getDynamicMarketMetadata() {
  const markets = await hl.supportedMarkets(hl.supportedChains())
  const metadata = await hl.getDynamicMarketMetadata(
    markets.map((m) => m.marketId) /* [ethMarketId] */,
    undefined
  )
  markets.forEach((m, index) => {
    console.log(m.marketId, '=> ', metadata[index])
  })
}

async function getAllPositions() {
  const positions = await hl.getAllPositions(w, undefined)
  console.dir(positions.result, { depth: 4 })
}

async function getAllOrders() {
  const orders = await hl.getAllOrders(w, undefined)
  console.dir(orders.result, { depth: 4 })
}

async function getAccountInfo() {
  const accountInfo = await hl.getAccountInfo(w, undefined)
  console.dir(accountInfo, { depth: 4 })
}

hl.init(w).then(() => {
  getAllPositions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
})
