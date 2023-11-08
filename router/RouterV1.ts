import { FixedNumber } from "ethers-v6";
import { Chain } from "viem";
import { Protocol, MarketInfo, DynamicMarketMetadata, CreateOrder, UnsignedTxWithMetadata, UpdateOrder, CancelOrder, PositionInfo, ClosePositionData, UpdatePositionMarginData, CollateralData, AmountInfo, PageOptions, PaginatedRes, OrderInfo, HistoricalTradeInfo, LiquidationInfo, OpenTradePreviewInfo, CloseTradePreviewInfo, PreviewInfo, Market } from "../src/interfaces/V1/IRouterAdapterBaseV1";
import { IRouterV1 } from "../src/interfaces/V1/IRouterV1";
import { protocols } from "../src/common/protocols";
import { arbitrum, optimism } from "viem/chains";

class RouterV1 implements IRouterV1 {

  supportedProtocols(): Protocol[] {
    const protocolKeys = Object.keys(protocols);
    const out = protocolKeys.map((key) => {
      return {
        protocolId: key
      } as Protocol
    })

    return out;
  }
  setup(swAddr: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  supportedChains(): Chain[] {
    return [arbitrum, optimism]
  }
  supportedMarkets(chains: Chain[] | undefined): Promise<MarketInfo[]> {
    throw new Error("Method not implemented.");
  }
  getMarketPrices(marketIds: string[]): Promise<FixedNumber[]> {
    throw new Error("Method not implemented.");
  }
  getMarketsInfo(marketIds: string[]): Promise<MarketInfo[]> {
    throw new Error("Method not implemented.");
  }
  getDynamicMarketMetadata(marketIds: string[]): Promise<DynamicMarketMetadata[]> {
    throw new Error("Method not implemented.");
  }
  increasePosition(orderData: CreateOrder[]): Promise<UnsignedTxWithMetadata[]> {
    throw new Error("Method not implemented.");
  }
  updateOrder(orderData: UpdateOrder[]): Promise<UnsignedTxWithMetadata[]> {
    throw new Error("Method not implemented.");
  }
  cancelOrder(orderData: CancelOrder[]): Promise<UnsignedTxWithMetadata[]> {
    throw new Error("Method not implemented.");
  }
  closePosition(positionInfo: PositionInfo[], closePositionData: ClosePositionData[]): Promise<UnsignedTxWithMetadata[]> {
    throw new Error("Method not implemented.");
  }
  updatePositionMargin(positionInfo: PositionInfo[], updatePositionMarginData: UpdatePositionMarginData[]): Promise<UnsignedTxWithMetadata[]> {
    throw new Error("Method not implemented.");
  }
  getIdleMargins(wallet: string): Promise<(CollateralData & { marketId: Market['marketId']; amount: FixedNumber; })[]> {
    throw new Error("Method not implemented.");
  }
  getAllPositions(wallet: string, pageOptions: PageOptions | undefined): Promise<PaginatedRes<PositionInfo>> {
    throw new Error("Method not implemented.");
  }
  getAllOrders(wallet: string, pageOptions: PageOptions | undefined): Promise<PaginatedRes<OrderInfo>> {
    throw new Error("Method not implemented.");
  }
  getAllOrdersForPosition(wallet: string, positionInfo: PositionInfo[], pageOptions: PageOptions | undefined): Promise<PaginatedRes<Record<string, OrderInfo[]>>> {
    throw new Error("Method not implemented.");
  }
  getTradesHistory(wallet: string, pageOptions: PageOptions | undefined): Promise<PaginatedRes<HistoricalTradeInfo>> {
    throw new Error("Method not implemented.");
  }
  getLiquidationHistory(wallet: string, pageOptions: PageOptions | undefined): Promise<PaginatedRes<LiquidationInfo>> {
    throw new Error("Method not implemented.");
  }
  getOpenTradePreview(wallet: string, orderData: CreateOrder[], existingPos: (PositionInfo | undefined)[]): Promise<OpenTradePreviewInfo[]> {
    throw new Error("Method not implemented.");
  }
  getCloseTradePreview(wallet: string, positionInfo: PositionInfo[], closePositionData: ClosePositionData[]): Promise<CloseTradePreviewInfo[]> {
    throw new Error("Method not implemented.");
  }
  getUpdateMarginPreview(wallet: string, isDeposit: boolean[], marginDelta: AmountInfo[], existingPos: (PositionInfo | undefined)[]): Promise<PreviewInfo[]> {
    throw new Error("Method not implemented.");
  }

}
