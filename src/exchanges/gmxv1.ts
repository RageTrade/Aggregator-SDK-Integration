import {
  Signer,
  UnsignedTransaction,
  BigNumberish,
  ethers,
  BigNumber,
} from "ethers";
import {
  CollateralData,
  DynamicMarketMetadata,
  ExtendedMarket,
  ExtendedOrder,
  ExtendedPosition,
  IExchange,
  Market,
  MarketIdentifier,
  Network,
  NumberDecimal,
  OpenMarkets,
  Order,
  Position,
  Token,
  TradeHistory,
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
import {
  V1_TOKENS,
  getPositionQuery,
  getTokenBySymbol,
  getTokens,
  getWhitelistedTokens,
  getInfoTokens,
  useInfoTokens,
  getPositions,
  getLiquidationPrice,
  MIN_ORDER_USD,
  bigNumberify,
  formatAmount,
  USD_DECIMALS,
  getServerUrl,
  getServerBaseUrl,
  getToken,
} from "../configs/gmx/tokens";
import { logObject, toNumberDecimal } from "../common/helper";

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
  private protocolIdentifier = "gmxV1";
  private nativeTokenAddress = getContract(ARBITRUM, "NATIVE_TOKEN")!;
  private shortTokenAddress = getTokenBySymbol(ARBITRUM, "USDC.e")!.address;
  private swAddr: string;
  private whitelistedTokens = getWhitelistedTokens(ARBITRUM);
  private indexTokens = this.whitelistedTokens
    .filter((token) => !token.isStable && !token.isWrapped)
    .map((token) => {
      let tokenIn: Token = {
        address: token.address,
        decimals: token.decimals.toString(),
        symbol: token.symbol,
        name: token.name,
      };
      return tokenIn;
    });
  private collateralTokens = this.whitelistedTokens
    .filter((token) => !token.isTempHidden)
    .map((token) => {
      let tokenIn: Token = {
        address: token.address,
        decimals: token.decimals.toString(),
        symbol: token.symbol,
        name: token.name,
      };
      return tokenIn;
    });

  constructor(_swAddr: string) {
    this.swAddr = _swAddr;
  }

  getDynamicMetadata(market: ExtendedMarket): Promise<DynamicMarketMetadata> {
    throw new Error("Method not implemented.");
  }

  invariant(condition: any, errorMsg: string | undefined) {
    if (!condition) {
      throw new Error(errorMsg);
    }
  }

  async setup(signer: Signer): Promise<UnsignedTransaction[]> {
    const referralStorage = ReferralStorage__factory.connect(
      getContract(ARBITRUM, "ReferralStorage")!,
      signer
    );

    // Check if user has already setup
    const code = await referralStorage.traderReferralCodes(this.swAddr);
    if (code != ethers.constants.HashZero) {
      return Promise.resolve([]);
    }

    let txs: UnsignedTransaction[] = [];

    // set referral code
    const setReferralCodeTx =
      await referralStorage.populateTransaction.setTraderReferralCodeByUser(
        this.REFERRAL_CODE
      );
    txs.push(setReferralCodeTx);

    // approve router
    const router = Router__factory.connect(
      getContract(ARBITRUM, "Router")!,
      signer
    );
    const approveOrderBookTx = await router.populateTransaction.approvePlugin(
      getContract(ARBITRUM, "OrderBook")!
    );
    txs.push(approveOrderBookTx);

    const approvePositionRouterTx =
      await router.populateTransaction.approvePlugin(
        getContract(ARBITRUM, "PositionRouter")!
      );
    txs.push(approvePositionRouterTx);

    return txs;
  }

  async getApproveRouterSpendTx(
    tokenAddress: string,
    signer: Signer,
    allowanceAmount: BigNumber
  ): Promise<UnsignedTransaction | undefined> {
    let token = IERC20__factory.connect(tokenAddress, signer);

    let allowance = await token.allowance(
      await signer.getAddress(),
      getContract(ARBITRUM, "Router")!
    );

    if (allowance.lt(allowanceAmount)) {
      let tx = await token.populateTransaction.approve(
        getContract(ARBITRUM, "Router")!,
        ethers.constants.MaxUint256
      );
      return tx;
    }

    return Promise.resolve(undefined);
  }

  supportedNetworks(): readonly Network[] {
    const networks: Network[] = [];
    networks.push({
      name: "arbitrum",
      chainId: ARBITRUM,
    });
    return networks;
  }

  async supportedMarkets(network: Network): Promise<ExtendedMarket[]> {
    let markets: ExtendedMarket[] = [];

    this.indexTokens.forEach((indexToken) => {
      markets.push({
        mode: "ASYNC",
        longCollateral: this.collateralTokens,
        shortCollateral: this.collateralTokens,
        supportedOrderTypes: {
          LIMIT_INCREASE: true,
          LIMIT_DECREASE: true,
          MARKET_INCREASE: true,
          MARKET_DECREASE: true,
          DEPOSIT: false,
          WITHDRAW: false,
        },
        supportedOrderActions: {
          CREATE: true,
          UPDATE: true,
          CANCEL: true,
        },
        asset: indexToken.symbol,
        indexOrIdentifier: this.getTokenAddress(indexToken),
        marketToken: indexToken,
        maxLeverage: toNumberDecimal(BigNumber.from("50"), 0),
        minInitialMargin: toNumberDecimal(BigNumber.from("0"), 0),
        protocolName: this.protocolIdentifier,
      });
    });

    return markets;
  }

  async getMarketPrice(market: ExtendedMarket): Promise<NumberDecimal> {
    const indexPricesUrl = getServerUrl(ARBITRUM, "/prices");
    const response = await fetch(indexPricesUrl);
    const jsonResponse = await response.json();
    // console.dir(jsonResponse, { depth: 10 });

    const indexPrice = jsonResponse[market.indexOrIdentifier];

    return {
      value: bigNumberify(indexPrice)!.toString(),
      decimals: USD_DECIMALS,
    };
  }

  async getMarketPriceByIndexAddress(indexAddr: string): Promise<BigNumber> {
    const indexPricesUrl = getServerUrl(ARBITRUM, "/prices");
    const response = await fetch(indexPricesUrl);
    const jsonResponse = await response.json();
    // console.dir(jsonResponse, { depth: 10 });

    const indexPrice = jsonResponse[indexAddr];

    return bigNumberify(indexPrice)!;
  }

  async createOrder(
    signer: Signer,
    market: ExtendedMarket,
    order: Order
  ): Promise<UnsignedTransaction[]> {
    let txs: UnsignedTransaction[] = [];

    if (
      (order.type == "LIMIT_INCREASE" || order.type == "MARKET_INCREASE") &&
      order.inputCollateral.address != ethers.constants.AddressZero
    ) {
      //approve router for token spends
      let approvalTx = await this.getApproveRouterSpendTx(
        order.inputCollateral.address,
        signer,
        order.inputCollateralAmount!
      );
      if (approvalTx) {
        txs.push(approvalTx);
      }
    }

    const tokenAddress0 = this.getTokenAddressString(
      order.inputCollateral.address
    );

    let createOrderTx: UnsignedTransaction;
    if (order.type == "LIMIT_INCREASE") {
      const orderBook = OrderBook__factory.connect(
        getContract(ARBITRUM, "OrderBook")!,
        signer
      );

      const path: string[] = [];
      path.push(tokenAddress0);

      createOrderTx = await orderBook.populateTransaction.createIncreaseOrder(
        path,
        order.inputCollateralAmount,
        market.indexOrIdentifier,
        0,
        order.sizeDelta,
        market.indexOrIdentifier,
        order.direction == "LONG" ? true : false,
        order.trigger?.triggerPrice!,
        !(order.direction == "LONG"),
        this.EXECUTION_FEE,
        order.inputCollateral.address == ethers.constants.AddressZero,
        {
          value:
            order.inputCollateral.address == ethers.constants.AddressZero
              ? BigNumber.from(this.EXECUTION_FEE).add(
                  order.inputCollateralAmount
                )
              : this.EXECUTION_FEE,
        }
      );
    } else if (order.type == "LIMIT_DECREASE") {
      const orderBook = OrderBook__factory.connect(
        getContract(ARBITRUM, "OrderBook")!,
        signer
      );

      createOrderTx = await orderBook.populateTransaction.createDecreaseOrder(
        market.indexOrIdentifier,
        order.sizeDelta,
        order.inputCollateral.address,
        order.inputCollateralAmount, // in USD e30
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
      path.push(tokenAddress0);
      if (order.direction == "LONG") {
        if (tokenAddress0 != market.indexOrIdentifier) {
          path.push(market.indexOrIdentifier);
        }
      } else {
        if (tokenAddress0 != this.shortTokenAddress) {
          path.push(this.shortTokenAddress);
        }
      }

      if (order.inputCollateral.address != ethers.constants.AddressZero) {
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
            path,
            market.indexOrIdentifier,
            0,
            order.sizeDelta,
            order.direction == "LONG" ? true : false,
            order.trigger?.triggerPrice!,
            this.EXECUTION_FEE,
            ethers.constants.HashZero, // Referral code set during setup()
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
      if (tokenAddress0 != market.indexOrIdentifier) {
        path.push(tokenAddress0);
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
    txs.push(createOrderTx!);

    return txs;
  }

  async updateOrder(
    signer: Signer,
    market: ExtendedMarket,
    updatedOrder: Partial<ExtendedOrder>
  ): Promise<UnsignedTransaction[]> {
    const orderBook = OrderBook__factory.connect(
      getContract(ARBITRUM, "OrderBook")!,
      signer
    );

    // TODO - check for approve tx

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
    orderIdentifier: BigNumberish,
    market: ExtendedMarket
  ): Promise<ExtendedOrder> {
    throw new Error("Method not implemented.");
  }

  getAllOrders(user: string): Promise<ExtendedOrder[]> {
    throw new Error("Method not implemented.");
  }

  getMarketOrders(
    user: string,
    market: ExtendedMarket
  ): Promise<ExtendedOrder[]> {
    throw new Error("Method not implemented.");
  }

  getPosition(
    positionIdentifier: string,
    market: ExtendedMarket,
    user?: string
  ): Promise<Position> {
    throw new Error("Method not implemented.");
  }

  async getAllPositions(
    user: string,
    signer: Signer
  ): Promise<ExtendedPosition[]> {
    const reader = Reader__factory.connect(
      getContract(ARBITRUM, "Reader")!,
      signer
    );

    const nativeTokenAddress = getContract(ARBITRUM, "NATIVE_TOKEN");

    const whitelistedTokens = V1_TOKENS[ARBITRUM];
    const tokenAddresses = whitelistedTokens.map((x) => x.address);

    const positionQuery = getPositionQuery(
      whitelistedTokens as {
        address: string;
        isStable: boolean;
        isWrapped: boolean;
      }[],
      nativeTokenAddress!
    );

    // console.log(positionQuery)

    const positionDataPromise = reader.getPositions(
      getContract(ARBITRUM, "Vault")!,
      user,
      positionQuery.collateralTokens,
      positionQuery.indexTokens,
      positionQuery.isLong
    );

    const tokenBalancesPromise = reader.getTokenBalances(user, tokenAddresses);

    // console.log(tokenBalances)

    const fundingRateInfoPromise = reader.getFundingRates(
      getContract(ARBITRUM, "Vault")!,
      nativeTokenAddress!,
      tokenAddresses
    );

    // console.log(fundingRateInfo)

    const [positionData, tokenBalances, fundingRateInfo] = await Promise.all([
      positionDataPromise,
      tokenBalancesPromise,
      fundingRateInfoPromise,
    ]);

    const { infoTokens } = await useInfoTokens(
      signer.provider!,
      ARBITRUM,
      false,
      tokenBalances,
      fundingRateInfo
    );

    // console.log(infoTokens)

    const { positions, positionsMap } = getPositions(
      ARBITRUM,
      positionQuery,
      positionData,
      infoTokens,
      false,
      true,
      ethers.utils.getAddress(user),
      undefined,
      undefined
    );

    // console.log(positions)

    let extPositions: ExtendedPosition[] = [];

    for (const pos of positions) {
      const maxAmount: BigNumber = pos.collateralAfterFee
        .sub(MIN_ORDER_USD)
        .gt(0)
        ? pos.collateralAfterFee.sub(MIN_ORDER_USD)
        : bigNumberify(0);

      // console.log({ maxAmount });

      const extP: ExtendedPosition = {
        indexOrIdentifier: pos.key, // account + collateral + index + isLong
        size: pos.size,
        collateral: pos.collateral,
        averageEntryPrice: pos.averagePrice,
        cumulativeFunding: pos.fundingFee,
        lastUpdatedAtTimestamp: pos.lastIncreasedTime,
        unrealizedPnl: pos.hasProfitAfterFees
          ? pos.pendingDeltaAfterFees
          : pos.pendingDeltaAfterFees.mul(-1),
        liqudationPrice: getLiquidationPrice({
          size: pos.size,
          collateral: pos.collateral,
          averagePrice: pos.averagePrice,
          isLong: pos.isLong,
          fundingFee: pos.fundingFee,
        }),
        fee: pos.totalFees,
        accessibleMargin: maxAmount,
        leverage: pos.leverage,
        exceedsPriceProtection: pos.hasLowCollateral,
        direction: pos.isLong ? "LONG" : "SHORT",
        originalCollateralToken: pos.originalCollateralToken,
        indexToken: this.convertToToken(
          getToken(ARBITRUM, this.getIndexTokenAddressFromPositionKey(pos.key))
        ),
        collateralToken: this.convertToToken(
          getToken(
            ARBITRUM,
            this.getCollateralTokenAddressFromPositionKey(pos.key)
          )
        ),
      };

      extPositions.push(extP);
    }

    // console.log(extPositions)

    return extPositions;
  }

  async updatePositionMargin(
    signer: Signer,
    position: ExtendedPosition,
    marginAmount: BigNumber, // For deposit it's in token terms and for withdraw it's in USD terms (F/E)
    isDeposit: boolean,
    transferToken: Token | undefined
  ): Promise<UnsignedTransaction[]> {
    const positionRouter = PositionRouter__factory.connect(
      getContract(ARBITRUM, "PositionRouter")!,
      signer
    );
    let indexAddress = this.getIndexTokenAddressFromPositionKey(
      position.indexOrIdentifier
    );
    let fillPrice = await this.getMarketPriceByIndexAddress(indexAddress);

    let marginTx: UnsignedTransaction;
    const path: string[] = [];
    let txs: UnsignedTransaction[] = [];

    if (isDeposit) {
      if (
        transferToken &&
        transferToken.address != ethers.constants.AddressZero
      ) {
        //approve router for token spends
        let approvalTx = await this.getApproveRouterSpendTx(
          transferToken.address,
          signer,
          marginAmount
        );
        if (approvalTx) {
          txs.push(approvalTx);
        }
      } else {
        let approvalTx = await this.getApproveRouterSpendTx(
          indexAddress,
          signer,
          marginAmount
        );
        if (approvalTx) {
          txs.push(approvalTx);
        }
      }

      fillPrice =
        position.direction == "LONG"
          ? fillPrice.mul(101).div(100)
          : fillPrice.mul(99).div(100);

      if (
        transferToken &&
        transferToken.address == ethers.constants.AddressZero
      ) {
        path.push(this.nativeTokenAddress);
        if (this.nativeTokenAddress != indexAddress) {
          path.push(indexAddress);
        }

        marginTx =
          await positionRouter.populateTransaction.createIncreasePositionETH(
            path,
            indexAddress,
            0,
            BigNumber.from(0),
            position.direction == "LONG" ? true : false,
            fillPrice,
            this.EXECUTION_FEE,
            ethers.constants.HashZero, // Referral code set during setup()
            ethers.constants.AddressZero,
            {
              value: BigNumber.from(this.EXECUTION_FEE).add(marginAmount),
            }
          );
      } else {
        if (transferToken && transferToken.address != indexAddress) {
          path.push(transferToken.address);
        }
        path.push(indexAddress);

        marginTx =
          await positionRouter.populateTransaction.createIncreasePosition(
            path,
            indexAddress,
            marginAmount,
            0,
            BigNumber.from(0),
            position.direction == "LONG" ? true : false,
            fillPrice,
            this.EXECUTION_FEE,
            ethers.constants.HashZero, // Referral code set during setup()
            ethers.constants.AddressZero,
            {
              value: this.EXECUTION_FEE,
            }
          );
      }
    } else {
      path.push(indexAddress);
      // TODO - check if working
      if (transferToken && transferToken.address != this.shortTokenAddress) {
        path.push(this.getTokenAddressString(transferToken.address));
      }
      fillPrice =
        position.direction == "LONG"
          ? fillPrice.mul(99).div(100)
          : fillPrice.mul(101).div(100);

      marginTx =
        await positionRouter.populateTransaction.createDecreasePosition(
          path,
          indexAddress,
          marginAmount,
          BigNumber.from(0),
          position.direction == "LONG" ? true : false,
          this.swAddr,
          fillPrice,
          0,
          this.EXECUTION_FEE,
          transferToken != undefined &&
            transferToken.address == ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          {
            value: this.EXECUTION_FEE,
          }
        );
    }

    txs.push(marginTx);

    return txs;
  }

  async closePosition(
    signer: Signer,
    position: ExtendedPosition,
    closeSize: BigNumber,
    outputToken: Token | undefined
  ): Promise<UnsignedTransaction[]> {
    let collateralOutAddr = outputToken
      ? outputToken.address
      : position.originalCollateralToken;

    let indexAddress = this.getIndexTokenAddressFromPositionKey(
      position.indexOrIdentifier
    );

    let fillPrice = await this.getMarketPriceByIndexAddress(indexAddress);

    fillPrice =
      position.direction == "LONG"
        ? fillPrice.mul(99).div(100)
        : fillPrice.mul(101).div(100);

    let collateralDelta = position.collateral
      .mul(closeSize)
      .div(position.size)
      .add(position.unrealizedPnl!.mul(closeSize).div(position.size));
    // console.log("collateralDelta: ", collateralDelta.toString());

    return this.createOrder(
      signer,
      {
        mode: "ASYNC",
        longCollateral: this.collateralTokens,
        shortCollateral: this.collateralTokens,
        indexOrIdentifier: indexAddress,
        address: indexAddress,
        supportedOrderTypes: {
          LIMIT_DECREASE: true,
          LIMIT_INCREASE: true,
          MARKET_INCREASE: true,
          MARKET_DECREASE: true,
          DEPOSIT: false,
          WITHDRAW: false,
        },
      },
      {
        type: "MARKET_DECREASE",
        direction: position.direction!,
        inputCollateral: {
          name: "string",
          symbol: "string",
          decimals: "string",
          address: collateralOutAddr!,
        },
        inputCollateralAmount: collateralDelta,
        sizeDelta: closeSize,
        isTriggerOrder: false,
        referralCode: undefined,
        trigger: {
          triggerPrice: fillPrice,
          triggerAboveThreshold: true,
        },
      }
    );
  }

  getMarketPositions(user: string, market: string): Promise<Position[]> {
    throw new Error("Method not implemented.");
  }

  async getTradesHistory(
    user: string,
    _: OpenMarkets | undefined
  ): Promise<TradeHistory[]> {
    let url = `${getServerBaseUrl(ARBITRUM)}/actions?account=${user}`;
    const data = await (await fetch(url)).json();

    const trades: TradeHistory[] = [];

    for (const each of data) {
      const params = JSON.parse(each.data.params);

      const isLong = params.order?.isLong || params.isLong;

      let keeperFeesPaid = undefined;

      if (params.feeBasisPoints) {
        keeperFeesPaid = BigNumber.from(params.sizeDelta)
          .mul(params.feeBasisPoints)
          .div(10_000);
      }

      const t: TradeHistory = {
        marketIdentifier: { indexOrIdentifier: each.id },
        timestamp: each.data.timestamp,
        operation: each.data.action,
        sizeDelta: params.order?.sizeDelta || params.sizeDelta,
        direction: isLong ? (isLong === true ? "LONG" : "SHORT") : isLong,
        price:
          params.order?.acceptablePrice ||
          params.order?.triggerPrice ||
          params.acceptablePrice ||
          params.price,
        collateralDelta:
          params.order?.collateralDelta ||
          params.collateralDelta ||
          BigNumber.from(0),
        realisedPnl: BigNumber.from(0),
        keeperFeesPaid: keeperFeesPaid || params.order?.executionFee,
        isTriggerAboveThreshold: params.order?.triggerAboveThreshold,
        txHash: each.data.txhash,
      };

      trades.push(t);
    }

    return trades;
  }

  getIdleMargins(user: string): Promise<(MarketIdentifier & CollateralData)[]> {
    throw new Error("Method not implemented.");
  }

  getTradePreview(
    user: string,
    signer: Signer,
    market: ExtendedMarket,
    order: Order
  ): Promise<ExtendedPosition> {
    throw new Error("Method not implemented.");
  }

  getEditTradePreview(
    user: string,
    signer: Signer,
    position: ExtendedPosition,
    sizeDelta: ethers.BigNumber,
    marginDelta: ethers.BigNumber,
    isDeposit: boolean
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

  //////// HELPERS //////////

  getTokenAddress(token: Token): string {
    if (token.address === ethers.constants.AddressZero) {
      return this.nativeTokenAddress;
    }
    return token.address;
  }

  getTokenAddressString(tokenAddress: string): string {
    if (tokenAddress === ethers.constants.AddressZero) {
      return this.nativeTokenAddress;
    }
    return tokenAddress;
  }

  getIndexTokenAddressFromPositionKey(positionKey: string): string {
    return positionKey.split(":")[2];
  }

  getCollateralTokenAddressFromPositionKey(positionKey: string): string {
    return positionKey.split(":")[1];
  }

  convertToToken(inToken: {
    address: string;
    decimals: number;
    symbol: string;
    name: string;
  }): Token {
    let token: Token = {
      address: inToken.address,
      decimals: inToken.decimals.toString(),
      symbol: inToken.symbol,
      name: inToken.name,
    };
    return token;
  }
}
