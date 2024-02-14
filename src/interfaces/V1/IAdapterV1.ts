import { SupportedChains, Token } from '../../common/tokens'
import { AmountInfo, ApiOpts, AvailableToTradeParams, IRouterAdapterBaseV1, ProtocolId } from './IRouterAdapterBaseV1'

export type DepositData = Record<SupportedChains, Token[]>

export type ProtocolInfo = {
  hasAgent: boolean
  hasAccount: boolean
  hasOrderbook: boolean
  sizeDeltaInToken: boolean
  explicitFundingClaim: boolean
  collateralDeltaInToken: boolean
  collateralUsesLimitPricing: boolean
  depositData: DepositData | undefined // defined for protocols which have account
}

export interface IAdapterV1 extends IRouterAdapterBaseV1 {
  protocolId: ProtocolId

  getProtocolInfo(): ProtocolInfo

  getAvailableToTrade(
    wallet: string,
    params: AvailableToTradeParams<this['protocolId']>,
    opts?: ApiOpts
  ): Promise<AmountInfo>
}
