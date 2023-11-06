import GmxV2Service from '../src/exchanges/gmxv2'

const ex = new GmxV2Service()

const xrpMarketId = '0x0CCB4fAa6f1F1B30911619f1184082aB4E25813c:GMXV2:42161'
const ethMarketId = '0xe2fEDb9e6139a182B98e7C2688ccFa3e9A53c665:GMXV2:42161'

async function testGetAllPositions() {
  const res = await ex.getAllPositions('0x2f88a09ed4174750a464576FE49E586F90A34820', undefined)
  console.log({ res })
}

async function testSupportedMarkets() {
  const res = await ex.supportedMarkets(ex.supportedNetworks())
  console.dir({ res }, { depth: 4 })
}

async function testGetMarketsInfo() {
  const mIds = [xrpMarketId, ethMarketId]
  const res = await ex.getMarketsInfo(mIds)
  console.dir({ res }, { depth: 4 })
}

async function testMarketPrices() {
  const markets = await ex.supportedMarkets(ex.supportedNetworks())

  for (const m of markets) {
    const price = await ex.getMarketPrices([m.marketId])
    console.log(m.indexToken.symbol, ': ', { price })
  }
}

async function test() {
  await testGetAllPositions()
}

test()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
