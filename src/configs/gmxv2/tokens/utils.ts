import { BigNumber } from 'ethers'
import { expandDecimals } from '../../../common/helper'
import { Token, TokenPrices } from '../types'
import { TokensData } from './types'
import { NATIVE_TOKEN_ADDRESS } from '../config/tokens'

export function parseContractPrice(price: BigNumber, tokenDecimals: number) {
  return price.mul(expandDecimals(1, tokenDecimals))
}

export function convertToTokenAmount(
  usd: BigNumber | undefined,
  tokenDecimals: number | undefined,
  price: BigNumber | undefined
) {
  if (!usd || typeof tokenDecimals !== 'number' || !price?.gt(0)) {
    return undefined
  }

  return usd.mul(expandDecimals(1, tokenDecimals)).div(price)
}

export function convertToUsd(
  tokenAmount: BigNumber | undefined,
  tokenDecimals: number | undefined,
  price: BigNumber | undefined
) {
  if (!tokenAmount || typeof tokenDecimals !== 'number' || !price) {
    return undefined
  }

  return tokenAmount.mul(price).div(expandDecimals(1, tokenDecimals))
}

export function getMidPrice(prices: TokenPrices) {
  return prices.minPrice.add(prices.maxPrice).div(2)
}

export function getTokenData(tokensData?: TokensData, address?: string, convertTo?: 'wrapped' | 'native') {
  if (!address || !tokensData?.[address]) {
    return undefined
  }

  const token = tokensData[address]

  if (convertTo === 'wrapped' && token.isNative && token.wrappedAddress) {
    return tokensData[token.wrappedAddress]
  }

  if (convertTo === 'native' && token.isWrapped) {
    return tokensData[NATIVE_TOKEN_ADDRESS]
  }

  return token
}

export function getIsEquivalentTokens(token1: Token, token2: Token) {
  if (token1.address === token2.address) {
    return true
  }

  if (token1.wrappedAddress === token2.address || token2.wrappedAddress === token1.address) {
    return true
  }

  if ((token1.isSynthetic || token2.isSynthetic) && token1.symbol === token2.symbol) {
    return true
  }

  return false
}

export function convertToContractPrice(price: BigNumber, tokenDecimals: number) {
  return price.div(expandDecimals(1, tokenDecimals))
}

export function convertToContractTokenPrices(prices: TokenPrices, tokenDecimals: number) {
  return {
    min: convertToContractPrice(prices.minPrice, tokenDecimals),
    max: convertToContractPrice(prices.maxPrice, tokenDecimals)
  }
}
