import type { GetMarketsResult } from '@reyaxyz/api-sdk'
import { ApiClient } from '@reyaxyz/api-sdk'
import { configureSDK } from '@reyaxyz/sdk'
import { arbitrum } from 'viem/chains'

import type { Token } from '../../common/tokens'

export const reya = arbitrum

ApiClient.configure('production')
configureSDK('production')
export function reyaUpdateTokensMap(allMarkets: GetMarketsResult) {
  allMarkets.forEach((m) => {
    REYA_TOKENS_MAP[m.quoteToken] = {
      symbol: m.quoteToken,
      name: m.quoteToken,
      decimals: 18,
      address: {
        42161: undefined,
        10: undefined,
        81457: undefined
      }
    }
  })
}

export const REYA_TOKENS_MAP: Record<string, Token> = {}
