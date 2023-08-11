import {
  Signer,
  UnsignedTransaction,
  BigNumberish,
  ethers,
  BigNumber,
} from "ethers";
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
  PositionRouter__factory,
  Reader__factory,
  ReferralStorage__factory,
  Router__factory,
} from "../../gmxV1Typechain";
import { getContract } from "../configs/gmx/contracts";
import { ARBITRUM, getConstant } from "../configs/gmx/chains";
import { getTokenBySymbol, getTokens } from "../configs/gmx/tokens";

export default class GmxV1Service implements IExchange {
  private REFERRAL_CODE = ethers.utils.hexZeroPad(
    ethers.utils.toUtf8Bytes("RAGE"),
    32
  );

  // taking as DECREASE_ORDER_EXECUTION_GAS_FEE because it is highest and diff is miniscule
  private EXECUTION_FEE = getConstant(
    ARBITRUM,
    "DECREASE_ORDER_EXECUTION_GAS_FEE"
  )! as BigNumberish;

  private nativeTokenAddress = getContract(ARBITRUM, "NATIVE_TOKEN")!;

  private swAddr: string;

  constructor(_swAddr: string) {
    this.swAddr = _swAddr;
  }

  invariant(condition: any, errorMsg: string | undefined) {
    if (!condition) {
      throw new Error(errorMsg);
    }
  }

  async setup(signer: Signer): Promise<void> {
    // set referral code
    const referralStorage = ReferralStorage__factory.connect(
      getContract(ARBITRUM, "ReferralStorage")!,
      signer
    );
    const setReferralCodeTx = await referralStorage.setTraderReferralCodeByUser(
      this.REFERRAL_CODE
    );
    await setReferralCodeTx.wait(1);

    // approve router
    const router = Router__factory.connect(
      getContract(ARBITRUM, "Router")!,
      signer
    );
    const approveOrderBookTx = await router.approvePlugin(
      getContract(ARBITRUM, "OrderBook")!
    );
    await approveOrderBookTx.wait(1);

    const approvePositionRouterTx = await router.approvePlugin(
      getContract(ARBITRUM, "PositionRouter")!
    );
    await approvePositionRouterTx.wait(1);

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
    const tx = await token.approve(
      getContract(ARBITRUM, "Router")!,
      ethers.constants.MaxUint256
    );
    await tx.wait(1);
  }

  supportedNetworks(): readonly Network[] {
    const networks: Network[] = [];
    networks.push({
      name: "arbitrum",
      chainId: ARBITRUM,
    });
    return networks;
  }

  supportedMarkets(network: Network): Promise<readonly Market[]> {
    throw new Error("Method not implemented.");
  }

  keys(obj: object) {
    return Object.keys(obj) as Array<keyof Object>;
  }

  logObject(title: string, obj: object) {
    console.log(
      title,
      this.keys(obj).map((key) => key + ": " + obj[key].toString())
    );
  }

  getMarketPrice(market: Market): Promise<ethers.BigNumber> {
    throw new Error("Method not implemented.");
  }

  async createOrder(
    signer: Signer,
    market: Market,
    order: Order
  ): Promise<UnsignedTransaction[]> {
    let createOrderTx;

    if (order.type == "LIMIT_INCREASE") {
      this.invariant(
        !(order.direction == "LONG") ||
          market.indexOrIdentifier === order.inputCollateral.address,
        "invalid token addresses"
      );
      this.invariant(
        market.indexOrIdentifier !== ethers.constants.AddressZero,
        "indexToken is 0"
      );

      const orderBook = OrderBook__factory.connect(
        getContract(ARBITRUM, "OrderBook")!,
        signer
      );

      const path: string[] = [];
      path.push(order.inputCollateral.address);

      createOrderTx = await orderBook.populateTransaction.createIncreaseOrder(
        path,
        order.inputCollateralAmount,
        market.indexOrIdentifier,
        0,
        order.sizeDelta,
        order.inputCollateral.address,
        order.direction == "LONG" ? true : false,
        order.trigger?.triggerPrice!,
        !(order.direction == "LONG"),
        this.EXECUTION_FEE,
        order.shouldWrap!,
        {
          value: order.shouldWrap!
            ? BigNumber.from(this.EXECUTION_FEE).add(
                order.inputCollateralAmount
              )
            : this.EXECUTION_FEE,
        }
      );
    } else if (order.type == "LIMIT_DECREASE") {
      this.invariant(
        !(order.direction == "LONG") ||
          market.indexOrIdentifier === order.inputCollateral.address,
        "invalid token addresses"
      );
      this.invariant(
        market.indexOrIdentifier !== ethers.constants.AddressZero,
        "indexToken is 0"
      );

      const orderBook = OrderBook__factory.connect(
        getContract(ARBITRUM, "OrderBook")!,
        signer
      );

      const path: string[] = [];
      path.push(order.inputCollateral.address);

      createOrderTx = await orderBook.populateTransaction.createDecreaseOrder(
        market.indexOrIdentifier,
        order.sizeDelta,
        order.inputCollateral.address,
        order.inputCollateralAmount,
        order.direction == "LONG" ? true : false,
        order.trigger?.triggerPrice!,
        order.trigger?.triggerAboveThreshold!,
        {
          value: this.EXECUTION_FEE,
        }
      );
    } else if (order.type == "MARKET_INCREASE") {
      const positionRouter = PositionRouter__factory.connect(
        getContract(ARBITRUM, "PositionRouter")!,
        signer
      );

      const path: string[] = [];
      path.push(order.inputCollateral.address);
      if (order.inputCollateral.address != market.indexOrIdentifier) {
        path.push(market.indexOrIdentifier);
      }

      if (order.inputCollateral.address != this.nativeTokenAddress) {
        createOrderTx =
          await positionRouter.populateTransaction.createIncreasePosition(
            path,
            market.indexOrIdentifier,
            order.inputCollateralAmount,
            0,
            order.sizeDelta,
            order.direction == "LONG" ? true : false,
            order.trigger?.triggerPrice!,
            this.EXECUTION_FEE,
            ethers.constants.HashZero, // Referral code set during setup()
            ethers.constants.AddressZero,
            {
              value: this.EXECUTION_FEE,
            }
          );
      } else {
        createOrderTx =
          await positionRouter.populateTransaction.createIncreasePositionETH(
            [order.inputCollateral.address],
            market.indexOrIdentifier,
            0,
            order.sizeDelta,
            order.direction == "LONG" ? true : false,
            order.trigger?.triggerPrice!,
            this.EXECUTION_FEE,
            this.REFERRAL_CODE,
            ethers.constants.AddressZero,
            {
              value: BigNumber.from(this.EXECUTION_FEE).add(
                order.inputCollateralAmount
              ),
            }
          );
      }
    } else if (order.type == "MARKET_DECREASE") {
      const positionRouter = PositionRouter__factory.connect(
        getContract(ARBITRUM, "PositionRouter")!,
        signer
      );

      const path: string[] = [];
      path.push(market.indexOrIdentifier);
      if (
        order.inputCollateral.address != ethers.constants.AddressZero &&
        order.inputCollateral.address != market.indexOrIdentifier
      ) {
        path.push(order.inputCollateral.address);
      }

      createOrderTx =
        await positionRouter.populateTransaction.createDecreasePosition(
          path,
          market.indexOrIdentifier,
          order.inputCollateralAmount,
          order.sizeDelta,
          order.direction == "LONG" ? true : false,
          this.swAddr,
          order.trigger?.triggerPrice!,
          0,
          this.EXECUTION_FEE,
          order.inputCollateral.address == ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          {
            value: this.EXECUTION_FEE,
          }
        );
    }
    return [createOrderTx!];
  }

  async updateOrder(
    signer: Signer,
    market: Market,
    updatedOrder: Partial<ExtendedOrder>
  ): Promise<UnsignedTransaction[]> {
    const orderBook = OrderBook__factory.connect(
      getContract(ARBITRUM, "OrderBook")!,
      signer
    );

    let updateOrderTx;

    if (updatedOrder.type! == "LIMIT_INCREASE") {
      updateOrderTx = await orderBook.populateTransaction.updateIncreaseOrder(
        updatedOrder.orderIdentifier!,
        updatedOrder.sizeDelta!,
        updatedOrder.trigger?.triggerPrice!,
        updatedOrder.trigger?.triggerAboveThreshold!
      );
    } else if (updatedOrder.type! == "LIMIT_DECREASE") {
      updateOrderTx = await orderBook.populateTransaction.updateIncreaseOrder(
        updatedOrder.orderIdentifier!,
        updatedOrder.sizeDelta!,
        updatedOrder.trigger?.triggerPrice!,
        updatedOrder.trigger?.triggerAboveThreshold!
      );
    } else {
      throw new Error("Invalid order type");
    }

    return [updateOrderTx];
  }

  async cancelOrder(
    signer: Signer,
    market: Market,
    order: Partial<ExtendedOrder>
  ): Promise<UnsignedTransaction[]> {
    const orderBook = OrderBook__factory.connect(
      getContract(ARBITRUM, "OrderBook")!,
      signer
    );

    let cancelOrderTx;

    if (order.type! == "LIMIT_INCREASE") {
      cancelOrderTx = await orderBook.populateTransaction.cancelIncreaseOrder(
        order.orderIdentifier!
      );
    } else if (order.type! == "LIMIT_DECREASE") {
      cancelOrderTx = await orderBook.populateTransaction.cancelDecreaseOrder(
        order.orderIdentifier!
      );
    } else {
      throw new Error("Invalid order type");
    }

    return [cancelOrderTx];
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

  getPosition(positionIdentifier: string, user?: string): Promise<Position> {
    throw new Error("Method not implemented.");
  }

  async getAllPositionsTest(user: string, signer: Signer) {}

  async getAllPositions(
    user: string,
    signer: Signer
  ): Promise<ExtendedPosition[]> {
    const reader = Reader__factory.connect(
      getContract(ARBITRUM, "Reader")!,
      signer
    );

    const nativeTokenAddress = getContract(ARBITRUM, "NATIVE_TOKEN")!;

    const indexTokens = getTokens(ARBITRUM)
      .filter((token) => !token.isStable && !token.isWrapped)
      .map((token) =>
        token.address == ethers.constants.AddressZero
          ? nativeTokenAddress
          : token.address
      );
    // console.log(indexTokens);
    const shortCollateralToken = getTokenBySymbol(ARBITRUM, "USDC.e")!.address;
    // console.log(shortCollateralToken);

    let collateralTokens: string[] = [];
    let indexes: string[] = [];
    let isLongs: boolean[] = [];

    // for longs collateralToken = indexToken
    indexTokens.forEach((token) => {
      collateralTokens.push(token);
      indexes.push(token);
      isLongs.push(true);
    });
    // for shorts collateralToken = USDC.e
    indexTokens.forEach((token) => {
      collateralTokens.push(shortCollateralToken);
      indexes.push(token);
      isLongs.push(false);
    });

    // console.log(collateralTokens);
    // console.log(indexes);
    // console.log(isLongs);

    const positionData = await reader.getPositions(
      getContract(ARBITRUM, "Vault")!,
      user,
      collateralTokens,
      indexes,
      isLongs
    );
    // console.log(positionData);

    const propsLength = 9;

    let positions: ExtendedPosition[] = [];

    for (let i = 0; i < indexes.length; i++) {
      let size = positionData[i * propsLength];
      if (size.eq(0)) continue;

      const key = this.getPositionKey(
        user,
        collateralTokens[i],
        indexes[i],
        isLongs[i],
        nativeTokenAddress
      );

      let position: ExtendedPosition = {
        indexOrIdentifier: key,
        size: size,
        collateral: positionData[i * propsLength + 1],
        averageEntryPrice: positionData[i * propsLength + 2],
        lastUpdatedAtTimestamp: positionData[i * propsLength + 6].toNumber(),
      };
      positions.push(position);
    }

    return positions;
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

  getPositionKey(
    account: string,
    collateralTokenAddress: string,
    indexTokenAddress: string,
    isLong: boolean,
    nativeTokenAddress?: string
  ) {
    const tokenAddress0 =
      collateralTokenAddress === ethers.constants.AddressZero
        ? nativeTokenAddress
        : collateralTokenAddress;
    const tokenAddress1 =
      indexTokenAddress === ethers.constants.AddressZero
        ? nativeTokenAddress
        : indexTokenAddress;
    return account + ":" + tokenAddress0 + ":" + tokenAddress1 + ":" + isLong;
  }

  getPositionContractKey(
    account: string,
    collateralToken: string,
    indexToken: string,
    isLong: boolean
  ) {
    return ethers.utils.solidityKeccak256(
      ["address", "address", "address", "bool"],
      [account, collateralToken, indexToken, isLong]
    );
  }
}
