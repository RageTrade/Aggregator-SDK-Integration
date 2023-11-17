import { Chain } from 'viem'
import {
  Protocol,
  MarketInfo,
  DynamicMarketMetadata,
  CreateOrder,
  UnsignedTxWithMetadata,
  UpdateOrder,
  CancelOrder,
  PositionInfo,
  ClosePositionData,
  UpdatePositionMarginData,
  CollateralData,
  AmountInfo,
  PageOptions,
  PaginatedRes,
  OrderInfo,
  HistoricalTradeInfo,
  LiquidationInfo,
  OpenTradePreviewInfo,
  CloseTradePreviewInfo,
  PreviewInfo,
  IRouterAdapterBaseV1,
  ProtocolId,
  Market,
  RouterAdapterMethod,
  PositionData,
  ClaimInfo
} from '../src/interfaces/V1/IRouterAdapterBaseV1'
import { IRouterV1 } from '../src/interfaces/V1/IRouterV1'
import { protocols } from '../src/common/protocols'
import { arbitrum, optimism } from 'viem/chains'
import GMXV2Service from '../src/exchanges/gmxv2'
import { getPaginatedResponse } from '../src/common/helper'
import { decodeMarketId } from '../src/common/markets'
import { FixedNumber } from '../src/common/fixedNumber'

export default class RouterV1 implements IRouterV1 {
  adapters: Record<string, IRouterAdapterBaseV1> = {}

  private _checkAndGetProtocolId(marketId: Market['marketId']) {
    const { protocolId } = decodeMarketId(marketId)
    const adapter = this.adapters[protocolId]
    if (!adapter) throw new Error(`Protocol ${protocolId} not supported`)
    return protocolId
  }

  constructor() {
    this.adapters[protocols.GMXV2.symbol] = new GMXV2Service()
  }

  async getClaimHistory(wallet: string, pageOptions: PageOptions | undefined): Promise<PaginatedRes<ClaimInfo>> {
    const promises: Promise<PaginatedRes<ClaimInfo>>[] = []
    const result: ClaimInfo[] = []

    for (const key in this.adapters) {
      promises.push(this.adapters[key].getClaimHistory(wallet, undefined))
    }

    const out = await Promise.all(promises)
    out.forEach((res) => {
      result.push(...res.result)
    })

    return getPaginatedResponse(result, pageOptions)
  }

  async init(swAddr: string): Promise<void> {
    const initPromises: Promise<void>[] = []
    for (const key in this.adapters) {
      initPromises.push(this.adapters[key].init(swAddr))
    }
    await Promise.all(initPromises)
    return Promise.resolve()
  }

  async setup(): Promise<UnsignedTxWithMetadata[]> {
    const setupPromises: Promise<UnsignedTxWithMetadata[]>[] = []
    for (const key in this.adapters) {
      setupPromises.push(this.adapters[key].setup())
    }
    const out = await Promise.all(setupPromises)

    return out.flat()
  }

  supportedProtocols(): Protocol[] {
    const protocolKeys = Object.keys(this.adapters)
    const out = protocolKeys.map((key) => {
      return {
        protocolId: key
      } as Protocol
    })

    return out
  }

  supportedChains(): Chain[] {
    return [arbitrum, optimism]
  }

  async supportedMarkets(chains: Chain[] | undefined): Promise<MarketInfo[]> {
    const marketInfoPromises: Promise<MarketInfo[]>[] = []
    for (const key in this.adapters) {
      marketInfoPromises.push(this.adapters[key].supportedMarkets(chains))
    }

    const out = await Promise.all(marketInfoPromises)
    return out.flat()
  }
  async getMarketPrices(marketIds: Market['marketId'][]): Promise<FixedNumber[]> {
    const promises = []
    for (const marketId of marketIds) {
      const protocolId = this._checkAndGetProtocolId(marketId)
      promises.push(this.adapters[protocolId].getMarketPrices(marketIds))
    }
    const out = await Promise.all(promises)
    return out.flat()
  }
  async getMarketsInfo(marketIds: Market['marketId'][]): Promise<MarketInfo[]> {
    const promises = []
    for (const marketId of marketIds) {
      const protocolId = this._checkAndGetProtocolId(marketId)
      promises.push(this.adapters[protocolId].getMarketsInfo(marketIds))
    }
    const out = await Promise.all(promises)
    return out.flat()
  }
  async getDynamicMarketMetadata(marketIds: Market['marketId'][]): Promise<DynamicMarketMetadata[]> {
    const promises = []
    for (const marketId of marketIds) {
      const protocolId = this._checkAndGetProtocolId(marketId)
      promises.push(this.adapters[protocolId].getDynamicMarketMetadata(marketIds))
    }
    const out = await Promise.all(promises)
    return out.flat()
  }
  async increasePosition(orderData: CreateOrder[]): Promise<UnsignedTxWithMetadata[]> {
    const promises = []
    for (const order of orderData) {
      const protocolId = this._checkAndGetProtocolId(order.marketId)
      promises.push(this.adapters[protocolId].increasePosition([order]))
    }
    const out = await Promise.all(promises)
    return out.flat()
  }
  async updateOrder(orderData: UpdateOrder[]): Promise<UnsignedTxWithMetadata[]> {
    const promises = []
    for (const order of orderData) {
      const protocolId = this._checkAndGetProtocolId(order.marketId)
      promises.push(this.adapters[protocolId].updateOrder([order]))
    }
    const out = await Promise.all(promises)
    return out.flat()
  }
  async cancelOrder(orderData: CancelOrder[]): Promise<UnsignedTxWithMetadata[]> {
    const promises = []
    for (const order of orderData) {
      const protocolId = this._checkAndGetProtocolId(order.marketId)
      promises.push(this.adapters[protocolId].cancelOrder([order]))
    }
    const out = await Promise.all(promises)
    return out.flat()
  }
  async closePosition(
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[]
  ): Promise<UnsignedTxWithMetadata[]> {
    const promises: Promise<UnsignedTxWithMetadata[]>[] = []
    positionInfo.forEach((position, index) => {
      const protocolId = this._checkAndGetProtocolId(position.marketId)
      promises.push(this.adapters[protocolId].closePosition([position], [closePositionData[index]]))
    })
    const out = await Promise.all(promises)
    return out.flat()
  }
  async updatePositionMargin(
    positionInfo: PositionInfo[],
    updatePositionMarginData: UpdatePositionMarginData[]
  ): Promise<UnsignedTxWithMetadata[]> {
    const promises: Promise<UnsignedTxWithMetadata[]>[] = []
    positionInfo.forEach((position, index) => {
      const protocolId = this._checkAndGetProtocolId(position.marketId)
      promises.push(this.adapters[protocolId].updatePositionMargin([position], [updatePositionMarginData[index]]))
    })
    const out = await Promise.all(promises)
    return out.flat()
  }
  async claimFunding(wallet: string): Promise<UnsignedTxWithMetadata[]> {
    const claimPromises: Promise<UnsignedTxWithMetadata[]>[] = []
    for (const key in this.adapters) {
      claimPromises.push(this.adapters[key].claimFunding(wallet))
    }
    const out = await Promise.all(claimPromises)
    return out.flat()
  }
  async getIdleMargins(wallet: string): Promise<
    Array<
      CollateralData & {
        marketId: Market['marketId']
        amount: FixedNumber // Always token terms
      }
    >
  > {
    const promises: Promise<
      Array<
        CollateralData & {
          marketId: Market['marketId']
          amount: FixedNumber // Always token terms
        }
      >
    >[] = []
    for (const key in this.adapters) {
      promises.push(this.adapters[key].getIdleMargins(wallet))
    }
    const out = await Promise.all(promises)
    return out.flat()
  }
  async getAllPositions(wallet: string, pageOptions: PageOptions | undefined): Promise<PaginatedRes<PositionInfo>> {
    const promises: Promise<PaginatedRes<PositionInfo>>[] = []
    const result: PositionInfo[] = []

    for (const key in this.adapters) {
      promises.push(this.adapters[key].getAllPositions(wallet, undefined))
    }

    const out = await Promise.all(promises)

    out.forEach((res) => {
      result.push(...res.result)
    })

    return getPaginatedResponse(result, pageOptions)
  }
  async getAllOrders(wallet: string, pageOptions: PageOptions | undefined): Promise<PaginatedRes<OrderInfo>> {
    const promises: Promise<PaginatedRes<OrderInfo>>[] = []
    const result: OrderInfo[] = []

    for (const key in this.adapters) {
      promises.push(this.adapters[key].getAllOrders(wallet, undefined))
    }

    const out = await Promise.all(promises)
    out.forEach((res) => {
      result.push(...res.result)
    })

    return getPaginatedResponse(result, pageOptions)
  }

  async getAllOrdersForPosition(
    wallet: string,
    positionInfo: PositionInfo[],
    pageOptions: PageOptions | undefined
  ): Promise<Record<PositionData['posId'], PaginatedRes<OrderInfo>>> {
    const promises: Promise<Record<PositionData['posId'], PaginatedRes<OrderInfo>>>[] = []
    const result: Record<PositionData['posId'], PaginatedRes<OrderInfo>> = {}

    for (const position of positionInfo) {
      const protocolId = this._checkAndGetProtocolId(position.marketId)
      promises.push(this.adapters[protocolId].getAllOrdersForPosition(wallet, [position], pageOptions))
    }

    const out = await Promise.all(promises)
    out.forEach((res) => {
      for (const key in res) {
        result[key] = res[key]
      }
    })

    return result
  }

  async getTradesHistory(
    wallet: string,
    pageOptions: PageOptions | undefined
  ): Promise<PaginatedRes<HistoricalTradeInfo>> {
    const promises: Promise<PaginatedRes<HistoricalTradeInfo>>[] = []
    const result: HistoricalTradeInfo[] = []

    for (const key in this.adapters) {
      promises.push(this.adapters[key].getTradesHistory(wallet, undefined))
    }

    const out = await Promise.all(promises)
    out.forEach((res) => {
      result.push(...res.result)
    })

    return getPaginatedResponse(result, pageOptions)
  }
  async getLiquidationHistory(
    wallet: string,
    pageOptions: PageOptions | undefined
  ): Promise<PaginatedRes<LiquidationInfo>> {
    const promises: Promise<PaginatedRes<LiquidationInfo>>[] = []
    const result: LiquidationInfo[] = []

    for (const key in this.adapters) {
      promises.push(this.adapters[key].getLiquidationHistory(wallet, undefined))
    }

    const out = await Promise.all(promises)
    out.forEach((res) => {
      result.push(...res.result)
    })

    return getPaginatedResponse(result, pageOptions)
  }
  async getOpenTradePreview(
    wallet: string,
    orderData: CreateOrder[],
    existingPos: (PositionInfo | undefined)[]
  ): Promise<OpenTradePreviewInfo[]> {
    const promises: Promise<OpenTradePreviewInfo[]>[] = []
    orderData.forEach((order, index) => {
      const protocolId = this._checkAndGetProtocolId(order.marketId)
      promises.push(this.adapters[protocolId].getOpenTradePreview(wallet, [order], [existingPos[index]]))
    })
    const out = await Promise.all(promises)
    return out.flat()
  }
  async getCloseTradePreview(
    wallet: string,
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[]
  ): Promise<CloseTradePreviewInfo[]> {
    const promises: Promise<CloseTradePreviewInfo[]>[] = []
    positionInfo.forEach((position, index) => {
      const protocolId = this._checkAndGetProtocolId(position.marketId)
      promises.push(this.adapters[protocolId].getCloseTradePreview(wallet, [position], [closePositionData[index]]))
    })
    const out = await Promise.all(promises)
    return out.flat()
  }
  async getUpdateMarginPreview(
    wallet: string,
    isDeposit: boolean[],
    marginDelta: AmountInfo[],
    existingPos: PositionInfo[]
  ): Promise<PreviewInfo[]> {
    const promises: Promise<PreviewInfo[]>[] = []

    existingPos.forEach((position, index) => {
      const protocolId = this._checkAndGetProtocolId(position.marketId)
      promises.push(
        this.adapters[protocolId].getUpdateMarginPreview(
          wallet,
          [isDeposit[index]],
          [marginDelta[index]],
          [existingPos[index]]
        )
      )
    })

    const out = await Promise.all(promises)
    return out.flat()
  }
  async getTotalClaimableFunding(wallet: string): Promise<FixedNumber> {
    const fundingPromises: Promise<FixedNumber>[] = []
    for (const key in this.adapters) {
      fundingPromises.push(this.adapters[key].getTotalClaimableFunding(wallet))
    }
    const out = await Promise.all(fundingPromises)
    return out.reduce((acc, curr) => acc.add(curr), FixedNumber.fromValue(0, 30, 30))
  }

  async getTotalAccuredFunding(wallet: string): Promise<FixedNumber> {
    const fundingPromises: Promise<FixedNumber>[] = []
    for (const key in this.adapters) {
      fundingPromises.push(this.adapters[key].getTotalAccuredFunding(wallet))
    }
    const out = await Promise.all(fundingPromises)
    return out.reduce((acc, curr) => acc.add(curr), FixedNumber.fromValue(0, 30, 30))
  }
}
