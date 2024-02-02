import { roundedPrice } from './api/client'
import { L2Book, Level, ModifyRequest, Tif } from './api/types'
import { FixedNumber, abs, bipsDiff, addFN, mulFN } from '../../common/fixedNumber'
import { OrderType, TriggerData, OBLevel, TimeInForce } from '../../interfaces/V1/IRouterAdapterBaseV1'
import { countSignificantDigits, precisionFromNumber } from '../../common/helper'

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

export function toTif(tif: TimeInForce): Tif {
  return (tif[0].toUpperCase() + tif.slice(1).toLowerCase()) as Tif
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

export function hlMapLevelsToOBLevels(levels: Level[]): OBLevel[] {
  const obLevels: OBLevel[] = []
  let totalSz = FixedNumber.fromString('0')
  let totalSzUsd = FixedNumber.fromString('0')
  for (const level of levels) {
    const price = FixedNumber.fromString(level.px)
    const sizeToken = FixedNumber.fromString(level.sz)
    const sizeUsd = mulFN(price, sizeToken)
    totalSz = addFN(totalSz, sizeToken)
    totalSzUsd = addFN(totalSzUsd, sizeUsd)
    obLevels.push({
      price: FixedNumber.fromString(level.px),
      sizeToken: FixedNumber.fromString(level.sz),
      sizeUsd: sizeUsd,
      totalSizeToken: totalSz,
      totalSizeUsd: totalSzUsd
    })
  }

  return obLevels
}

export type HlMaxSigFigsData = {
  maxSigFigs: number
  maxSigFigPrice: number
  actualPrecision: FixedNumber
}

export function calcHlMaxSigFigData(l2Book: L2Book): HlMaxSigFigsData {
  let maxSigFigs = 0
  let maxSigFigPrice = 0
  l2Book.levels[0].forEach((l) => {
    const price = Number(l.px)
    const sigFigs = countSignificantDigits(price)
    if (sigFigs > maxSigFigs) {
      maxSigFigs = sigFigs
      maxSigFigPrice = price
    }
  })
  l2Book.levels[1].forEach((l) => {
    const price = Number(l.px)
    const sigFigs = countSignificantDigits(price)
    if (sigFigs > maxSigFigs) {
      maxSigFigs = sigFigs
      maxSigFigPrice = price
    }
  })

  const actualPrecision = precisionFromNumber(maxSigFigPrice)

  return {
    maxSigFigs,
    maxSigFigPrice,
    actualPrecision: FixedNumber.fromString(actualPrecision.toString())
  }
}
