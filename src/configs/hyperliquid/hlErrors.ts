import { CloseTradePreviewInfo, OpenTradePreviewInfo, PreviewInfo } from '../../interfaces/V1/IRouterAdapterBaseV1'
import { ZERO_FN } from '../../common/constants'
import { toAmountInfoFN } from '../../common/helper'
import { Token } from '../../common/tokens'

export const SIZE_DENOMINATION_TOKEN = 'Size must be token denominated'
export const SIZE_DENOMINATION_USD = 'Size must be USD denominated'
export const MARGIN_DENOMINATION_TOKEN = 'Margin delta must be token denominated'
export const MARGIN_DENOMINATION_USD = 'Margin delta must be USD denominated'

export const CANNOT_CHANGE_MODE = 'market mode cannot be changed with existing position'
export const LEV_OUT_OF_BOUNDS = 'calculated leverage is out of bounds'
export const CANNOT_DEC_LEV = 'leverage cannot be decreased'
export const CANNOT_UPDATE_MARGIN_FOR_CROSS = 'cannot update margin for cross position'
export const PRICE_IMPACT_TOO_HIGH = 'price impact too high'
export const CLOSE_SIZE_ZERO = '(Rounded) Close size cannot be zero'

export function preErrRes(
  marketId: string,
  sizeDeltaInToken: boolean,
  marginDeltaInToken: boolean,
  collateral: Token,
  errMsg: string
): PreviewInfo {
  return {
    marketId: marketId,
    collateral: collateral,
    leverage: ZERO_FN,
    size: toAmountInfoFN(ZERO_FN, sizeDeltaInToken),
    margin: toAmountInfoFN(ZERO_FN, marginDeltaInToken),
    avgEntryPrice: ZERO_FN,
    liqudationPrice: ZERO_FN,
    fee: ZERO_FN,
    isError: true,
    errMsg: errMsg
  }
}

export function openPreErrRes(
  marketId: string,
  sizeDeltaInToken: boolean,
  marginDeltaInToken: boolean,
  collateral: Token,
  errMsg: string
): OpenTradePreviewInfo {
  return {
    ...preErrRes(marketId, sizeDeltaInToken, marginDeltaInToken, collateral, errMsg),
    priceImpact: ZERO_FN
  }
}

export function closePreErrRes(
  marketId: string,
  sizeDeltaInToken: boolean,
  marginDeltaInToken: boolean,
  collateral: Token,
  errMsg: string
): CloseTradePreviewInfo {
  return {
    ...preErrRes(marketId, sizeDeltaInToken, marginDeltaInToken, collateral, errMsg),
    receiveMargin: toAmountInfoFN(ZERO_FN, marginDeltaInToken)
  }
}
