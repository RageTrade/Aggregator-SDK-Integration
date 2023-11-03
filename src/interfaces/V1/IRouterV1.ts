import { IRouterAdapterBaseV1, Protocol } from './IRouterAdapterBaseV1'

export interface IRouterV1 extends IRouterAdapterBaseV1 {
  ///// Protocol api //////
  supportedProtocols(): Protocol[]
}
