import { parseUnits } from 'ethers/lib/utils'
import SynthetixV2Adapter from '../src/exchanges/synthetixV2Adapter'
import { CreateOrder } from '../src/interfaces/V1/IRouterAdapterBaseV1'
import { toAmountInfo } from '../src/common/helper'
import { optimism, arbitrum } from 'viem/chains'
import { Token } from '../src/common/tokens'
import { startHermesStreaming, startStreaming } from '../src/configs/pyth/prices'

const ex = new SynthetixV2Adapter()

const btcMarketId = '10-SYNTHETIXV2-0x59b007E9ea8F89b069c43F8f45834d30853e3699'
const ethMarketId = '10-SYNTHETIXV2-0x2B3bb4c683BFc5239B029131EEf3B1d214478d93'

const normalAddress = '0x2f88a09ed4174750a464576FE49E586F90A34820'
const w = normalAddress

const sUSDAddr = '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9'
const sUsd: Token = {
  name: 'Synthetix USD',
  symbol: 'sUSD',
  decimals: 18,
  address: {
    [optimism.id]: sUSDAddr,
    [arbitrum.id]: undefined
  }
}

async function supportedMarkets() {
  const markets = await ex.supportedMarkets(ex.supportedChains())
  markets.forEach((m) => {
    console.log('Market: ', m)
  })
}

async function getDynamicMarketMetadata() {
  const metadata = await ex.getDynamicMarketMetadata([btcMarketId])
  console.dir({ metadata }, { depth: 4 })
}

async function getMarketPrices() {
  const prices = await ex.getMarketPrices([btcMarketId, ethMarketId])
  console.dir({ prices }, { depth: 4 })
}

async function getOpenTradePreview() {
  const marketPrice = (await ex.getMarketPrices([ethMarketId]))[0]

  const createOrderData: CreateOrder = {
    marketId: ethMarketId,
    direction: 'LONG',
    sizeDelta: toAmountInfo(parseUnits('0.05', 18), 18, true),
    marginDelta: toAmountInfo(parseUnits('50.86', 18), 18, true),
    triggerData: {
      triggerPrice: marketPrice,
      triggerAboveThreshold: false
    },
    collateral: sUsd,
    type: 'MARKET',
    slippage: 1
  }

  const preview = (
    await ex.getOpenTradePreview(w, [createOrderData], [undefined], {
      bypassCache: true,
      overrideStaleTime: 5 * 1000
    })
  )[0]
  console.dir({ preview }, { depth: 4 })
}

startHermesStreaming()
startStreaming()
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

delay(1000).then(() =>
  getOpenTradePreview()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
)
