import { AmountInfo, AvailableToTradeParams, IRouterAdapterBaseV1, ProtocolId } from './IRouterAdapterBaseV1'

export type ProtocolInfo = {
  hasAccount: boolean
  sizeDeltaInToken: boolean
  collateralDeltaInToken: boolean
}

export interface IAdapterV1 extends IRouterAdapterBaseV1 {
  protocolId: ProtocolId

  getProtocolInfo(): ProtocolInfo

  getAvailableToTrade(wallet: string, params: AvailableToTradeParams<this['protocolId']>): Promise<AmountInfo>
}
