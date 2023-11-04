import { FixedNumber } from 'ethers-v6'
import { IAdapterV1 } from '../interfaces/V1/IAdapterV1'
import {
  Network,
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
  ProtocolId,
  Market,
  Protocol,
  GenericStaticMarketMetadata
} from '../interfaces/V1/IRouterAdapterBaseV1'
import { rpc } from '../common/provider'
import { Reader__factory } from '../../typechain/gmx-v2'
import { BigNumber, ethers } from 'ethers'
import { ZERO } from '../common/constants'
import { logObject, toAmountInfo } from '../common/helper'
import { arbitrum } from 'viem/chains'
import { GMX_V2_COLLATERAL_TOKENS, getGmxV2TokenByAddress } from '../configs/gmxv2Tokens'
import { parseUnits } from 'ethers/lib/utils'

export default class GmxV2Service implements IAdapterV1 {
  private DATASTORE = '0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8'
  private READER = '0xf60becbba223EEA9495Da3f606753867eC10d139'
  private provider = rpc[42161]
  private reader = Reader__factory.connect(this.READER, this.provider)

  setup(swAddr: string): Promise<void> {
    throw new Error('Method not implemented.')
  }

  supportedNetworks(): Network[] {
    const networks: Network[] = []
    networks.push({
      name: 'arbitrum',
      chainId: 42161
    })
    return networks
  }

  async supportedMarkets(networks: Network[] | undefined): Promise<MarketInfo[]> {
    const marketProps = await this.reader.getMarkets(this.DATASTORE, 0, 1000)

    const marketsInfo: MarketInfo[] = []
    for (const mProp of marketProps) {
      const market: Market = {
        marketId: this.getGlobalMarketId(mProp.marketToken, 'GMXV2', arbitrum.id),
        indexToken: getGmxV2TokenByAddress(mProp.indexToken),
        longCollateral: GMX_V2_COLLATERAL_TOKENS,
        shortCollateral: GMX_V2_COLLATERAL_TOKENS,
        supportedOrderTypes: {
          LIMIT: true,
          MARKET: true,
          STOP_LOSS: true,
          TAKE_PROFIT: true
        },
        supportedOrderActions: {
          CREATE: true,
          UPDATE: true,
          CANCEL: true
        }
      }

      const staticMetadata: GenericStaticMarketMetadata = {
        maxLeverage: FixedNumber.fromValue(5),
        minLeverage: FixedNumber.fromValue('11', 1),
        minInitialMargin: toAmountInfo(parseUnits('10', 18), 18, false),
        minPositionSize: toAmountInfo(parseUnits('11', 18), 18, false)
      }

      const protocol: Protocol = {
        protocolId: 'GMXV2'
      }

      const marketInfo: MarketInfo = {
        ...market,
        ...staticMetadata,
        ...protocol
      }

      marketsInfo.push(marketInfo)
    }

    return marketsInfo
  }

  getMarketPrices(marketIds: string[]): Promise<FixedNumber[]> {
    throw new Error('Method not implemented.')
  }

  async getMarketsInfo(marketIds: string[]): Promise<MarketInfo[]> {
    const allMarketsInfo = await this.supportedMarkets(this.supportedNetworks())

    const marketsInfo: MarketInfo[] = []
    for (const mId of marketIds) {
      const marketInfo = allMarketsInfo.find((m) => m.marketId === mId)
      if (marketInfo === undefined) throw new Error(`Market ${mId} not found`)

      marketsInfo.push(marketInfo)
    }

    return marketsInfo
  }

  getDynamicMarketMetadata(marketIds: string[]): Promise<DynamicMarketMetadata[]> {
    throw new Error('Method not implemented.')
  }
  increasePosition(orderData: CreateOrder[]): Promise<UnsignedTxWithMetadata[]> {
    throw new Error('Method not implemented.')
  }
  updateOrder(orderData: UpdateOrder[]): Promise<UnsignedTxWithMetadata[]> {
    throw new Error('Method not implemented.')
  }
  cancelOrder(orderData: CancelOrder[]): Promise<UnsignedTxWithMetadata[]> {
    throw new Error('Method not implemented.')
  }
  closePosition(
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[]
  ): Promise<UnsignedTxWithMetadata[]> {
    throw new Error('Method not implemented.')
  }
  updatePositionMargin(
    positionInfo: PositionInfo[],
    updatePositionMarginData: UpdatePositionMarginData[]
  ): Promise<UnsignedTxWithMetadata[]> {
    throw new Error('Method not implemented.')
  }
  getIdleMargins(wallet: string): Promise<(CollateralData & { marketId: string; amount: AmountInfo })[]> {
    throw new Error('Method not implemented.')
  }

  async getAllPositions(wallet: string, pageOptions: PageOptions | undefined): Promise<PaginatedRes<PositionInfo>> {
    const indexes = this.getStartEndIndex(pageOptions)
    const allPositions = await this.reader.getAccountPositions(this.DATASTORE, wallet, indexes.start, indexes.end)

    allPositions.forEach((pos) => {
      logObject('pos Address', pos.addresses)
      logObject('pos Numbers', pos.numbers)
      logObject('pos flags', pos.flags)
    })

    // let posInfos: PositionInfo[] = []
    // for (const pos of allPositions) {
    //   const posInfo: PositionInfo = {
    //     protocolId: 'GMXV2',
    //     marketId: pos.addresses.market,
    //     posId: pos.addresses.market,
    //     size: toAmountInfo(pos.numbers.sizeInUsd, 18, false),
    //     margin: toAmountInfo(pos.numbers.collateralAmount, 18, false),

    //   }
    // }

    throw new Error('Method not implemented.')
  }

  getAllOrders(wallet: string, pageOptions: PageOptions | undefined): Promise<PaginatedRes<OrderInfo>> {
    throw new Error('Method not implemented.')
  }
  getAllOrdersForPosition(
    wallet: string,
    positionInfo: PositionInfo[],
    pageOptions: PageOptions | undefined
  ): Promise<PaginatedRes<Record<string, OrderInfo>>> {
    throw new Error('Method not implemented.')
  }
  getTradesHistory(wallet: string, pageOptions: PageOptions | undefined): Promise<PaginatedRes<HistoricalTradeInfo>> {
    throw new Error('Method not implemented.')
  }
  getLiquidationHistory(wallet: string, pageOptions: PageOptions | undefined): Promise<PaginatedRes<LiquidationInfo>> {
    throw new Error('Method not implemented.')
  }
  getOpenTradePreview(
    wallet: string,
    orderData: CreateOrder[],
    existingPos: (PositionInfo | undefined)[]
  ): Promise<OpenTradePreviewInfo[]> {
    throw new Error('Method not implemented.')
  }
  getCloseTradePreview(
    wallet: string,
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[]
  ): Promise<CloseTradePreviewInfo[]> {
    throw new Error('Method not implemented.')
  }
  getUpdateMarginPreview(
    wallet: string,
    isDeposit: boolean[],
    marginDelta: AmountInfo[],
    existingPos: (PositionInfo | undefined)[]
  ): Promise<PreviewInfo[]> {
    throw new Error('Method not implemented.')
  }

  //// Internal helper functions ////
  private getStartEndIndex(pageOptions: PageOptions | undefined): {
    start: BigNumber
    end: BigNumber
  } {
    if (pageOptions === undefined) {
      return {
        start: ZERO,
        end: ethers.constants.MaxUint256
      }
    }

    const { skip, limit } = pageOptions
    const start = BigNumber.from(skip)
    const end = start.add(limit)

    return {
      start,
      end
    }
  }

  private getGlobalMarketId(protocolMarketId: string, protocolId: ProtocolId, chainId: Network['chainId']): string {
    return protocolMarketId + ':' + protocolId + ':' + chainId
  }

  private getProtocolMarketId(globalMarketId: string): string {
    return globalMarketId.split(':')[0]
  }
}
