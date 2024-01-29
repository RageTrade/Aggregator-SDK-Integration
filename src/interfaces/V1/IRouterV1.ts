import { ProtocolInfo } from './IAdapterV1'
import { AmountInfo, AvailableToTradeParams, IRouterAdapterBaseV1, Protocol, ProtocolId } from './IRouterAdapterBaseV1'

export interface IRouterV1 extends IRouterAdapterBaseV1 {
  ///// Protocol api //////
  supportedProtocols(): Protocol[]

  getProtocolInfo(): (ProtocolInfo & Protocol)[]

  getAvailableToTrade<T extends ProtocolId>(
    protocol: T,
    wallet: string,
    params: AvailableToTradeParams<T>
  ): Promise<AmountInfo>
}
