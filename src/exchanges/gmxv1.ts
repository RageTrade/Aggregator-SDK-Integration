import { Signer, UnsignedTransaction, BigNumberish, ethers } from "ethers";
import {
  CollateralData,
  ExtendedOrder,
  ExtendedPosition,
  IExchange,
  Market,
  MarketIdentifier,
  Network,
  Order,
  Position,
} from "../interface";
import {
  IERC20__factory,
  OrderBook__factory,
  Router__factory,
} from "../../gmxV1Typechain";
import { getContract } from "../configs/gmx/contracts";
import { ARBITRUM } from "../configs/gmx/chains";
import { getTokenBySymbol } from "../configs/gmx/tokens";

export default class GmxV1Service implements IExchange {
  private REFERRAL_CODE = "RAGE";

  async setup(signer: Signer): Promise<void> {
    // approve router
    const router = Router__factory.connect(
      getContract(ARBITRUM, "Router")!,
      signer
    );
    await router.approvePlugin(getContract(ARBITRUM, "OrderBook")!);

    //approve router for token spends
    await this.approveRouterSpend(
      getTokenBySymbol(ARBITRUM, "WETH")!.address,
      signer
    );
    await this.approveRouterSpend(
      getTokenBySymbol(ARBITRUM, "USDC.e")!.address,
      signer
    );
    await this.approveRouterSpend(
      getTokenBySymbol(ARBITRUM, "USDC")!.address,
      signer
    );
    await this.approveRouterSpend(
      getTokenBySymbol(ARBITRUM, "BTC")!.address,
      signer
    );

    return Promise.resolve();
  }

  async approveRouterSpend(tokenAddress: string, signer: Signer) {
    let token = IERC20__factory.connect(tokenAddress, signer);
    await token.approve(
      getContract(ARBITRUM, "Router")!,
      ethers.constants.MaxUint256
    );
  }

  supportedNetworks(): readonly Network[] {
    throw new Error("Method not implemented.");
  }
  supportedMarkets(network: Network): Promise<readonly Market[]> {
    throw new Error("Method not implemented.");
  }
  createOrder(
    signer: Signer,
    market: Market,
    order: Order
  ): Promise<UnsignedTransaction> {
    throw new Error("Method not implemented.");
  }
  updateOrder(
    singer: Signer,
    market: Market,
    orderIdentifier: BigNumberish,
    updatedOrder: Partial<Order>
  ): Promise<UnsignedTransaction> {
    throw new Error("Method not implemented.");
  }
  cancelOrder(
    signer: Signer,
    market: Market,
    orderIdentifier: BigNumberish
  ): Promise<UnsignedTransaction> {
    throw new Error("Method not implemented.");
  }
  getOrder(
    user: string,
    orderIdentifier: BigNumberish
  ): Promise<ExtendedOrder> {
    throw new Error("Method not implemented.");
  }
  getAllOrders(user: string): Promise<ExtendedOrder[]> {
    throw new Error("Method not implemented.");
  }
  getMarketOrders(user: string, market: string): Promise<ExtendedOrder[]> {
    throw new Error("Method not implemented.");
  }
  getPosition(positionIdentifier: string): Promise<Position> {
    throw new Error("Method not implemented.");
  }
  getAllPositions(user: string): Promise<Position[]> {
    throw new Error("Method not implemented.");
  }
  getMarketPositions(user: string, market: string): Promise<Position[]> {
    throw new Error("Method not implemented.");
  }
  getPositionsHistory(positions: Position[]): Promise<ExtendedPosition[]> {
    throw new Error("Method not implemented.");
  }
  getIdleMargins(user: string): Promise<(MarketIdentifier & CollateralData)[]> {
    throw new Error("Method not implemented.");
  }
  getTradePreview(
    signer: Signer,
    market: Market,
    order: Order
  ): Promise<ExtendedPosition> {
    throw new Error("Method not implemented.");
  }
}
