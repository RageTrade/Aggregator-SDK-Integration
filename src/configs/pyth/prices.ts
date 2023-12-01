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

type PricesMap = Record<string, NumberDecimal | null>

let prices: PricesMap = {}

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
        value: ethers.utils.parseUnits(p.toFixed(18), 30).toString(),
        decimals: 30
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

  function attemptReconnect(retriesLeft: number, inDelay: number) {
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
  '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace': 'ETH',
  '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43': 'BTC'
}
const priceIds = Object.keys(priceIdsMap)

const connection = new PriceServiceConnection('https://hermes.pyth.network', {
  priceFeedRequestConfig: {
    // Provide this option to retrieve signed price updates for on-chain contracts.
    // Ignore this option for off-chain use.
    binary: false
  }
})

export function startHermesStreaming(retries = 10, delay = 3000) {
  console.log('[HERMES] price streaming started')

  try {
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
            value: value,
            decimals: 30
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

  function attemptReconnect(retriesLeft: number, inDelay: number) {
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

export function getTokenPrice(token: string) {
  if (token === 'sUSD') return UnitPrice

  if (token === 'sETH') token = 'ETH'
  if (token === 'sBTC') token = 'BTC'
  if (token === 'WETH') token = 'ETH'
  if (token === 'WBTC') token = 'BTC'
  if (token === 'WBTC.b') token = 'BTC'

  const price = hermesPricesMap[token]

  if (!price) return

  const decimals = price.decimals
  const value = BigNumber.from(price.value)

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

startHermesStreaming()
