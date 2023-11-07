import { getTokensMap, getV2Tokens } from '../config/tokens'
import { TokensData } from './types'
import { useTokenBalances } from './useTokenBalances'
import { useTokenRecentPrices } from './useTokenRecentPricesData'

type TokensDataResult = {
  tokensData?: TokensData
  pricesUpdatedAt?: number
}

export async function useTokensData(chainId: number, wallet: string): Promise<TokensDataResult> {
  const tokenConfigs = getTokensMap(chainId)
  const { balancesData } = await useTokenBalances(chainId, wallet)
  const { pricesData, updatedAt: pricesUpdatedAt } = await useTokenRecentPrices(chainId)

  const tokenAddresses = getV2Tokens(chainId).map((token) => token.address)

  if (!pricesData) {
    return {
      tokensData: undefined,
      pricesUpdatedAt: undefined
    }
  }

  return {
    tokensData: tokenAddresses.reduce((acc: TokensData, tokenAddress) => {
      const prices = pricesData[tokenAddress]
      const balance = balancesData?.[tokenAddress]
      const tokenConfig = tokenConfigs[tokenAddress]

      if (!prices) {
        return acc
      }

      acc[tokenAddress] = {
        ...tokenConfig,
        prices,
        balance
      }
      return acc
    }, {} as TokensData),
    pricesUpdatedAt
  }
}
