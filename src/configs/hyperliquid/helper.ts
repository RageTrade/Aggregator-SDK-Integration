import { roundedPrice } from './api/client'
import { Level, ModifyRequest } from './api/types'
import { FixedNumber, abs, bipsDiff } from '../../common/fixedNumber'
import { OrderType, TriggerData } from '../../interfaces/V1/IRouterAdapterBaseV1'

export function indexBasisSlippage(val: Level[], slippageBp: string): number {
  const val0p = FixedNumber.fromString(val[0].px)
  let index = 0
  for (let i = 1; i < val.length; i++) {
    const bidp = FixedNumber.fromString(val[i].px)
    if (abs(bipsDiff(val0p, bidp)).lte(FixedNumber.fromString(slippageBp, val0p.decimals))) {
      index = i
    } else {
      break
    }
  }
  return index
}

export function hlMarketIdToCoin(marketId: string): string {
  return marketId.split('-')[2]
}

export function validateTrigger(isBuy: boolean, midPrice: number, triggerPrice: number, isStop: boolean): boolean {
  return (
    (isBuy && (isStop ? triggerPrice > midPrice : triggerPrice < midPrice)) ||
    (!isBuy && (isStop ? triggerPrice < midPrice : triggerPrice > midPrice))
  )
}

export function populateTrigger(
  isBuy: boolean,
  midPrice: number,
  orderType: OrderType,
  triggerData: TriggerData
): {
  orderData: ModifyRequest['order']['order_type']
  limitPrice: ModifyRequest['order']['limit_px']
} {
  if (orderType == 'MARKET' || orderType == 'LIMIT') throw new Error('trigger used with wrong order type')

  if (!triggerData.triggerLimitPrice) throw new Error('trigger price required')

  const isStop = orderType == 'STOP_LOSS' || orderType == 'STOP_LOSS_LIMIT'

  const triggerPrice = roundedPrice(Number(triggerData.triggerPrice._value))
  const triggerLimitPrice = roundedPrice(Number(triggerData.triggerLimitPrice._value))

  // this check is required, otherwise it is not considered resting order and executes immidiately
  if (!validateTrigger(isBuy, midPrice, triggerPrice, isStop))
    throw new Error('trigger orderType, current price & trigger activation price are not compatible')

  if (isStop) {
    const orderData: ModifyRequest['order']['order_type'] = {
      trigger: {
        triggerPx: triggerPrice,
        isMarket: !orderType.includes('LIMIT'),
        tpsl: 'sl'
      }
    }

    return { orderData, limitPrice: triggerPrice }
  } else {
    const orderData: ModifyRequest['order']['order_type'] = {
      trigger: {
        triggerPx: triggerPrice,
        isMarket: !orderType.includes('LIMIT'),
        tpsl: 'tp'
      }
    }

    return { orderData, limitPrice: triggerLimitPrice }
  }
}
