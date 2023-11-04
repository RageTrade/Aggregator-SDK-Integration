import GmxV2Service from '../src/exchanges/gmxv2'

const ex = new GmxV2Service()

async function testGetAllPositions() {
  const res = await ex.getAllPositions('0x2f88a09ed4174750a464576FE49E586F90A34820', undefined)
  console.log({ res })
}

async function testSupportedMarkets() {
  const res = await ex.supportedMarkets(ex.supportedNetworks())
  console.dir({ res }, { depth: 4 })
}

async function test() {
  await testSupportedMarkets()
}

test()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
