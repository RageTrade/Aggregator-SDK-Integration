import { BigNumber, ethers } from 'ethers'
import { NumberDecimal } from '../../interface'

// Assuming you're working in a browser environment that supports fetch and ReadableStream
const streamingUrl = 'https://benchmarks.pyth.network/v1/shims/tradingview/streaming'

type PricesMap = Record<string, NumberDecimal | null>

let prices: PricesMap = {}

function handleStreamingData(data: { id: string; p: number }) {
  const { id, p } = data
  try {
    const symbolInfo = id.split('.')[1]
    const symbol = symbolInfo.split('/')[0]
    const symbolBase = symbolInfo.split('/')[1]

    // console.log({ id, symbolInfo, symbol, symbolBase, p });

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
}

export function startStreaming(retries = 3, delay = 3000) {
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
                  handleStreamingData(jsonData)
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

export function getTokenPrice(token: string) {
  if (token === 'sUSD') return UnitPrice

  if (token === 'sETH') token = 'ETH'
  if (token === 'sBTC') token = 'BTC'
  if (token === 'WETH') token = 'ETH'
  if (token === 'WBTC') token = 'BTC'
  if (token === 'WBTC.b') token = 'BTC'

  const price = prices[token]

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

startStreaming()
