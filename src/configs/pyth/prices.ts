import { BigNumber, ethers } from 'ethers'
import { NumberDecimal } from '../../interface'
import { PriceServiceConnection } from '@pythnetwork/price-service-client'

// Assuming you're working in a browser environment that supports fetch and ReadableStream
const streamingUrl = 'https://benchmarks.pyth.network/v1/shims/tradingview/streaming'

interface Bar {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

interface SubscriptionInfo {
  subscriberUID: string
  resolution: string
  lastDailyBar: Bar
  handlers: [
    {
      id: string
      callback: (bar: Bar) => void
    }
  ]
}

const channelToSubscription = new Map<string, SubscriptionInfo>()

export type PriceStamp = {
  price: NumberDecimal | null
  timestamp: number
}

type PricesMap = Record<string, PriceStamp>

let prices: PricesMap = {}

let isTVStreamingOn = false

function getNextDailyBarTime(barTime: number) {
  const date = new Date(barTime * 1000)
  date.setDate(date.getDate() + 1)
  return date.getTime() / 1000
}

function handleStreamingData(data: { id: string; p: number; t: number }) {
  const { id, p, t } = data

  try {
    const symbolInfo = id.split('.')[1]
    const symbol = symbolInfo.split('/')[0]
    const symbolBase = symbolInfo.split('/')[1]

    if (symbolBase === 'USD') {
      prices[symbol] = {
        price: {
          value: ethers.utils.parseUnits(p.toFixed(18), 30).toString(),
          decimals: 30
        },
        timestamp: Date.now()
      }
    }
    // console.dir({ prices }, { depth: 2 });
  } catch (e) {
    // console.error(`[stream] Error parsing streaming data:`);
  }

  const tradePrice = p
  const tradeTime = t * 1000 // Multiplying by 1000 to get milliseconds

  const channelString = id.split('.')[1].replace('/', '-')
  const subscriptionItem = channelToSubscription.get(channelString)
  // console.log({ id, channelString, channelToSubscription, subscriptionItem })

  if (!subscriptionItem) {
    return
  }

  const lastDailyBar = subscriptionItem.lastDailyBar
  const nextDailyBarTime = getNextDailyBarTime(lastDailyBar.time)

  let bar: Bar

  if (tradeTime >= nextDailyBarTime) {
    bar = {
      time: nextDailyBarTime,
      open: tradePrice,
      high: tradePrice,
      low: tradePrice,
      close: tradePrice
    }
    // console.log('[stream] Generate new bar', bar)
  } else {
    bar = {
      ...lastDailyBar,
      high: Math.max(lastDailyBar.high, tradePrice),
      low: Math.min(lastDailyBar.low, tradePrice),
      close: tradePrice
    }
    // console.log('[stream] Update the latest bar by price', tradePrice)
  }

  subscriptionItem.lastDailyBar = bar

  // Send data to every subscriber of that symbol
  subscriptionItem.handlers.forEach((handler) => handler.callback(bar))
  channelToSubscription.set(channelString, subscriptionItem)
}

export function startStreaming(retries = 3, delay = 3000) {
  console.log('price streaming started')

  if (!isTVStreamingOn) {
    isTVStreamingOn = true
    fetch(streamingUrl)
      .then((response) => {
        const reader = response.body!.getReader()

        function streamData() {
          reader
            .read()
            .then(({ value, done }) => {
              if (done) {
                console.error('[stream] Streaming ended.')
                return
              }

              // Assuming the streaming data is separated by line breaks
              const dataStrings = new TextDecoder().decode(value).split('\n')
              dataStrings.forEach((dataString) => {
                const trimmedDataString = dataString.trim()
                if (trimmedDataString) {
                  try {
                    var jsonData = JSON.parse(trimmedDataString)
                    if ('id' in jsonData) {
                      handleStreamingData(jsonData)
                    }
                  } catch (e) {
                    // console.error("Error parsing JSON:");
                  }
                }
              })

              streamData() // Continue processing the stream
            })
            .catch((error) => {
              console.error('[stream] Error reading from stream:', error)
              attemptReconnect(retries, delay)
            })
        }

        streamData()
      })
      .catch((error) => {
        console.error('[stream] Error fetching from the streaming endpoint:', error)
      })
  } else {
    console.log('[stream] Streaming already running.')
  }

  function attemptReconnect(retriesLeft: number, inDelay: number) {
    isTVStreamingOn = false
    if (retriesLeft > 0) {
      console.log(`[stream] Attempting to reconnect in ${inDelay}ms...`)
      setTimeout(() => {
        startStreaming(retriesLeft - 1, inDelay)
      }, inDelay)
    } else {
      console.error('[stream] Maximum reconnection attempts reached.')
    }
  }
}

export function subscribeOnStream(
  symbolInfo: { ticker: string },
  resolution: string,
  onRealtimeCallback: (bar: Bar) => void,
  subscriberUID: string,
  _: () => void,
  lastDailyBar: Bar
) {
  const channelString = symbolInfo.ticker
  const handler = {
    id: subscriberUID,
    callback: onRealtimeCallback
  }

  let subscriptionItem = channelToSubscription.get(channelString)

  subscriptionItem = {
    subscriberUID,
    resolution,
    lastDailyBar,
    handlers: [handler]
  }
  channelToSubscription.set(channelString, subscriptionItem)
  console.log('[subscribeBars]: Subscribe to streaming. Channel:', channelString)
}

export function unsubscribeFromStream(subscriberUID: string) {
  // Find a subscription with id === subscriberUID
  for (const channelString of channelToSubscription.keys()) {
    const subscriptionItem = channelToSubscription.get(channelString)

    if (!subscriptionItem) {
      console.log('[unsubscribeBars]: Subscription item not found')
      break
    }

    const handlerIndex = subscriptionItem.handlers.findIndex((handler) => handler.id === subscriberUID)

    if (handlerIndex !== -1) {
      // Unsubscribe from the channel if it is the last handler
      console.log('[unsubscribeBars]: Unsubscribe from streaming. Channel:', channelString)
      channelToSubscription.delete(channelString)
      break
    }
  }
}

export function isTVStreaming(): boolean {
  return isTVStreamingOn
}

const UnitPrice = {
  decimals: 30,
  formatted: '1',
  value: ethers.utils.parseUnits('1', 30)
}

export type BigNumDecimals = {
  decimals: number
  formatted: string
  value: BigNumber
}

//////// HERMES PRICE FEED ////////

let hermesPricesMap: PricesMap = {}

const priceIdsMap: Record<string, string> = {
  '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f': 'BNB',
  '0xb7e3904c08ddd9c0c10c6d207d390fd19e87eb6aab96304f571ed94caebdefa0': 'AXS',
  '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace': 'ETH',
  '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43': 'BTC',
  '0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221': 'LINK',
  '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d': 'SOL',
  '0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7': 'AVAX',
  '0x2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445': 'AAVE',
  '0x78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501': 'UNI',
  '0x5de33a9112c2b700b8d30b8a3402c103578ccfa2765696471cc672bd5cf6ac52': 'MATIC',
  '0x15add95022ae13563a11992e727c91bdb6b55bc183d9d747436c80a483d8c864': 'APE',
  '0x6489800bb8974169adfe35937bf6736507097d13c190d760c557108c7e93a81b': 'DYDX',
  '0x385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf': 'OP',
  '0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c': 'DOGE',
  '0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2': 'XAU',
  '0xf2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e': 'XAG',
  '0xa995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b': 'EUR',
  '0xb00b60f88b03a6a625a8d1c048c3f66653edf217439983d037e7222c4e612819': 'ATOM',
  '0x2fb245b9a84554a0f15aa123cbb5f64cd263b59e9a87d80148cbffab50c69f30': 'FLOW',
  '0x5c6c0d2386e3352356c3ab84434fafb5ea067ac2678a38a338c4a69ddc4bdb0c': 'FTM',
  '0xc415de8d2eba7db216527dff4b60e8f3a5311c740dadb233e13e12547e226750': 'NEAR',
  '0x67a6f93030420c1c9e3fe37c1ab6b77966af82f995944a9fefce357a22854a80': 'AUD',
  '0x84c2dde9633d93d1bcad84e7dc41c9d56578b7ec52fabedc1f335d673df0a7c1': 'GBP',
  '0x3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5': 'ARB',
  '0xc63e2a7f37a04e5e614c07238bedb25dcc38927fba8fe890597a593c0b2fa4ad': 'LDO',
  '0x6e3f3fa8253588df9326580180233eb791e03b443a3ba7a1d892e73874e19a54': 'LTC',
  '0x2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d': 'ADA',
  '0x150ac9b959aee0051e4091f0ef5216d941f590e1c5e7f91cf7635b5c11628c0e': 'FIL',
  '0xb962539d0fcb272a494d65ea56f94851c2bcf8823935da05bd628916e2e9edbf': 'GMX',
  '0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5': 'APT',
  '0xf0d57deca57b3da2fe63a493f4c25925fdfd8edf834b20f93e1f84dbd1504d4a': 'SHIB',
  '0x3dd2b63686a450ec7290df3a1e0b583c0481f651351edfa7636f39aed55cf8a3': 'BCH',
  '0xa19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8': 'CRV',
  '0xd69731a2e74ac1ce884fc3890f7ee324b6deb66147055249568869ed700882e4': 'PEPE',
  '0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744': 'SUI',
  '0x856aac602516addee497edf6f50d39e8c95ae5fb0da1ed434a8c2ab9c3e877e9': 'BLUR',
  '0xec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8': 'XRP',
  '0xca3eed9b267293f6595901c734c7525ce8ef49adafe8284606ceb307afa2ca5b': 'DOT',
  '0x67aed5a24fdad045475e7195c98a98aea119c763f272d4523f5bac93a4f33c2b': 'TRX',
  '0x6b1381ce7e874dc5410b197ac8348162c0dd6c0d4c9cd6322672d6c2b1d58293': 'FLOKI',
  '0x7a5bc1d2b56ad029048cd63964b3ad2776eadf812edc1a43a31406cb54bff592': 'INJ',
  '0x846ae1bdb6300b817cee5fdee2a6da192775030db5615b94a465f53bd40850b5': 'STETH',
  '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a': 'USDC',
  '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b': 'USDT',
  '0xb0948a5e5313200c632b51bb5ca32f6de0d36e9950a942d19751e833f70dabfd': 'DAI'
}
const priceIds = Object.keys(priceIdsMap)

const connection = new PriceServiceConnection('https://hermes.pyth.network', {
  priceFeedRequestConfig: {
    // Provide this option to retrieve signed price updates for on-chain contracts.
    // Ignore this option for off-chain use.
    binary: false
  }
})

let isHermesStreamingOn = false

export function startHermesStreaming(retries = 10, delay = 3000) {
  console.log('[HERMES] price streaming started')

  if (!isHermesStreamingOn) {
    try {
      isHermesStreamingOn = true
      connection.subscribePriceFeedUpdates(priceIds, (priceFeed) => {
        const price = priceFeed.getPriceNoOlderThan(60)
        if (price) {
          const symbol = priceIdsMap['0x' + priceFeed.id]
          if (symbol) {
            let pythDecimals = price.expo * -1
            let pythPrice = price.price
            let value = BigNumber.from(pythPrice)
              .mul(BigNumber.from(10).pow(30 - pythDecimals))
              .toString()

            hermesPricesMap[symbol] = {
              price: {
                value: value,
                decimals: 30
              },
              timestamp: Date.now()
            }
            // console.log(
            //   '[HERMES] price updated',
            //   symbol,
            //   ': ',
            //   ethers.utils.formatUnits(hermesPricesMap[symbol]!.value, 30)
            // )
          }
        }
      })
    } catch (error) {
      console.error('[HERMES] Error fetching from the streaming endpoint:', error)
      attemptReconnect(retries, delay)
    }
  } else {
    console.log('[HERMES] Streaming already running.')
  }

  function attemptReconnect(retriesLeft: number, inDelay: number) {
    isHermesStreamingOn = false
    if (retriesLeft > 0) {
      console.log(`[HERMES] Attempting to reconnect in ${inDelay}ms...`)
      setTimeout(() => {
        startHermesStreaming(retriesLeft - 1, inDelay)
      }, inDelay)
    } else {
      console.error('[HERMES] Maximum reconnection attempts reached.')
    }
  }
}

export function isHermesStreaming(): boolean {
  return isHermesStreamingOn
}

export function getTokenPrice(token: string) {
  if (token === 'sUSD') return UnitPrice

  if (token === 'sETH') token = 'ETH'
  if (token === 'sBTC') token = 'BTC'
  if (token === 'WETH') token = 'ETH'
  if (token === 'WBTC') token = 'BTC'
  if (token === 'WBTC.b') token = 'BTC'
  if (token === 'USDC.e') token = 'USDC'

  const priceStampHermes = hermesPricesMap[token]
  const priceStampTV = prices[token]

  const priceStamp = _getLatestPriceStamp(priceStampHermes, priceStampTV)

  if (!priceStamp || !priceStamp.price) return

  const decimals = priceStamp.price.decimals
  const value = BigNumber.from(priceStamp.price.value)

  return {
    decimals,
    value,
    formatted: ethers.utils.formatUnits(value, decimals)
  }
}

export function getTokenPriceD(token: string, decimals: number) {
  const tokenPrice = getTokenPrice(token)

  if (!tokenPrice) return null

  if (tokenPrice.decimals === decimals) {
    return tokenPrice.value
  } else if (tokenPrice.decimals > decimals) {
    return tokenPrice.value.div(BigNumber.from(10).pow(tokenPrice.decimals - decimals))
  } else {
    return tokenPrice.value.mul(BigNumber.from(10).pow(18 - tokenPrice.decimals))
  }
}

function _getLatestPriceStamp(priceStampHermes: PriceStamp | undefined, priceStampTV: PriceStamp | undefined) {
  if (!priceStampHermes && !priceStampTV) return

  if (!priceStampHermes || !priceStampHermes.price) return priceStampTV

  if (!priceStampTV || !priceStampTV.price) return priceStampHermes

  if (priceStampHermes.timestamp > priceStampTV.timestamp) return priceStampHermes

  return priceStampTV
}
