import { getByKey } from '../../../common/helper'
import { getWrappedToken } from '../config/tokens'
import { MarketsInfoData } from '../markets/types'
import { PositionsInfoData } from '../positions/types'
import { TokensData } from '../tokens/types'
import { OrdersInfoData } from './types'
import { useOrders } from './useOrders'
import { getOrderInfo, isVisibleOrder } from './utils'

type AggregatedOrdersDataResult = {
  ordersInfoData?: OrdersInfoData
  isLoading: boolean
}

export async function useOrdersInfo(
  chainId: number,
  p: {
    marketsInfoData?: MarketsInfoData
    tokensData?: TokensData
    positionsInfoData?: PositionsInfoData
    account: string | null | undefined
  }
): Promise<AggregatedOrdersDataResult> {
  const { marketsInfoData, tokensData, account, positionsInfoData } = p
  const { ordersData } = await useOrders(chainId, { account })

  const wrappedToken = getWrappedToken(chainId)

  if (!account) {
    return {
      isLoading: false
    }
  }

  if (!marketsInfoData || !ordersData || !tokensData) {
    return {
      isLoading: true
    }
  }

  const ordersInfoData = Object.keys(ordersData)
    .filter((orderKey) => isVisibleOrder(ordersData[orderKey].orderType))
    .reduce((acc: OrdersInfoData, orderKey: string) => {
      const order = getByKey(ordersData, orderKey)!

      const orderInfo = getOrderInfo({
        marketsInfoData,
        tokensData,
        wrappedNativeToken: wrappedToken,
        order,
        positionsInfoData
      })

      if (!orderInfo) {
        // eslint-disable-next-line no-console
        console.warn(`OrderInfo parsing error`, JSON.stringify(order))

        return acc
      }

      acc[orderKey] = orderInfo

      return acc
    }, {} as OrdersInfoData)

  return {
    ordersInfoData,
    isLoading: false
  }
}
