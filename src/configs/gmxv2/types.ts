import { BigNumber } from 'ethers'

export type ContractMarketPrices = {
  indexTokenPrice: {
    min: BigNumber
    max: BigNumber
  }
  longTokenPrice: {
    min: BigNumber
    max: BigNumber
  }
  shortTokenPrice: {
    min: BigNumber
    max: BigNumber
  }
}
