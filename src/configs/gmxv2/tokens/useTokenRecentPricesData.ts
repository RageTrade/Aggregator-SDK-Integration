import { getToken, getWrappedToken, NATIVE_TOKEN_ADDRESS } from '../config/tokens'
import { BigNumber } from 'ethers'
import { TokenPricesData } from './types'
import { useOracleKeeperFetcher } from './useOracleKeeperFetcher'
import { parseContractPrice } from './utils'
import { ApiOpts } from '../../../interfaces/V1/IRouterAdapterBaseV1'

type TokenPricesDataResult = {
  pricesData?: TokenPricesData
  updatedAt?: number
}

export async function useTokenRecentPrices(chainId: number, opts?: ApiOpts): Promise<TokenPricesDataResult> {
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId, opts)

  // console.log({ oracleKeeperFetcher })

  const data = await oracleKeeperFetcher.fetchTickers().then((priceItems) => {
    const result: TokenPricesData = {}

    priceItems.forEach((priceItem) => {
      let tokenConfig: any

      try {
        tokenConfig = getToken(chainId, priceItem.tokenAddress)
      } catch (e) {
        // ignore unknown token errors

        return
      }

      // console.log({ addr: priceItem.tokenAddress, priceItem, tokenConfig })

      result[tokenConfig.address] = {
        minPrice: parseContractPrice(BigNumber.from(priceItem.minPrice), tokenConfig.decimals),
        maxPrice: parseContractPrice(BigNumber.from(priceItem.maxPrice), tokenConfig.decimals)
      }
    })

    const wrappedToken = getWrappedToken(chainId)

    if (result[wrappedToken.address] && !result[NATIVE_TOKEN_ADDRESS]) {
      result[NATIVE_TOKEN_ADDRESS] = result[wrappedToken.address]
    }

    return {
      pricesData: result,
      updatedAt: Date.now()
    }
  })

  return {
    pricesData: data?.pricesData,
    updatedAt: data?.updatedAt
  }
}
