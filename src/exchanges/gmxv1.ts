import { UnsignedTransaction, BigNumberish, ethers, BigNumber } from "ethers";
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
  PROTOCOL_NAME,
  TRIGGER_TYPE,
  Provider,
  ViewError,
  UnsignedTxWithMetadata,
} from "../interface";
import {
  IERC20__factory,
  OrderBookReader__factory,
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
  getTradePreviewInternal,
  getCloseTradePreviewInternal,
  getEditCollateralPreviewInternal,
  GToken,
  checkTradePathLiquidiytInternal,
} from "../configs/gmx/tokens";
import { applySlippage, logObject, toNumberDecimal } from "../common/helper";
import { timer } from "execution-time-decorators";
import { parseUnits } from "ethers/lib/utils";

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
  private protocolIdentifier: PROTOCOL_NAME = "GMX_V1";
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

  async getDynamicMetadata(
    market: ExtendedMarket,
    provider: Provider
  ): Promise<DynamicMarketMetadata> {
    const reader = Reader__factory.connect(
      getContract(ARBITRUM, "Reader")!,
      provider
    );

    const nativeTokenAddress = getContract(ARBITRUM, "NATIVE_TOKEN");

    const fundingRateInfoPromise = reader.getFundingRates(
      getContract(ARBITRUM, "Vault")!,
      nativeTokenAddress!,
      [market.marketToken?.address!]
    );

    const { infoTokens } = await useInfoTokens(
      provider,
      ARBITRUM,
      false,
      [BigNumber.from(0)],
      await fundingRateInfoPromise
    );

    const info = infoTokens[market.marketToken?.address!];

    return {
      oiLongUsd: info.guaranteedUsd!,
      oiShortUsd: info.globalShortSize!,
      fundingRate: BigNumber.from(0),
      borrowRate: info.fundingRate,
      availableLiquidityLongUSD: info.maxAvailableLong,
      availableLiquidityShortUSD: info.maxAvailableShort,
      marketLimitUsd: BigNumber.from(0),
      marketLimitNative: BigNumber.from(0),
    };
  }

  invariant(condition: any, errorMsg: string | undefined) {
    if (!condition) {
      throw new Error(errorMsg);
    }
  }

  async setup(provider: Provider): Promise<UnsignedTxWithMetadata[]> {
    const referralStorage = ReferralStorage__factory.connect(
      getContract(ARBITRUM, "ReferralStorage")!,
      provider
    );

    // Check if user has already setup
    const code = await referralStorage.traderReferralCodes(this.swAddr);
    if (code != ethers.constants.HashZero) {
      return Promise.resolve([]);
    }

    let txs: UnsignedTxWithMetadata[] = [];

    // set referral code
    const setReferralCodeTx =
      await referralStorage.populateTransaction.setTraderReferralCodeByUser(
        this.REFERRAL_CODE
      );
    txs.push({
      tx: setReferralCodeTx, sessionKeyData: { module: "GMX_V1", sender: this.swAddr }, addtionalSessionData: undefined
    });

    // approve router
    const router = Router__factory.connect(
      getContract(ARBITRUM, "Router")!,
      provider
    );
    const approveOrderBookTx = await router.populateTransaction.approvePlugin(
      getContract(ARBITRUM, "OrderBook")!
    );
    txs.push({
      tx: approveOrderBookTx, sessionKeyData: { module: "GMX_V1", sender: this.swAddr }, addtionalSessionData: undefined
    });

    const approvePositionRouterTx =
      await router.populateTransaction.approvePlugin(
        getContract(ARBITRUM, "PositionRouter")!
      );
    txs.push({
      tx: approvePositionRouterTx, sessionKeyData: { module: "GMX_V1", sender: this.swAddr }, addtionalSessionData: undefined
    });

    return txs;
  }

  async getApproveRouterSpendTx(
    tokenAddress: string,
    provider: Provider,
    allowanceAmount: BigNumber
  ): Promise<UnsignedTxWithMetadata | undefined> {
    let token = IERC20__factory.connect(tokenAddress, provider);
    const router = getContract(ARBITRUM, "Router")!;

    let allowance = await token.allowance(
      this.swAddr,
      router
    );

    if (allowance.lt(allowanceAmount)) {
      let tx = await token.populateTransaction.approve(
        router,
        ethers.constants.MaxUint256
      );
      return { tx, sessionKeyData: { module: "ERC20_APPROVAL", chainId: ARBITRUM }, addtionalSessionData: { chainId: ARBITRUM, spender: router, token: tokenAddress } };
    }

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
        minLeverage: toNumberDecimal(parseUnits("1.1", 4), 4),
        maxLeverage: toNumberDecimal(parseUnits("50", 4), 4),
        minInitialMargin: toNumberDecimal(BigNumber.from("0"), 30),
        protocolName: this.protocolIdentifier,
        minPositionSize: toNumberDecimal(parseUnits("10", 30), 30),
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
    provider: Provider,
    market: ExtendedMarket,
    order: Order
  ): Promise<UnsignedTxWithMetadata[]> {
    let txs: UnsignedTxWithMetadata[] = [];

    // approval tx
    if (
      (order.type == "LIMIT_INCREASE" || order.type == "MARKET_INCREASE") &&
      order.inputCollateral.address != ethers.constants.AddressZero
    ) {
      //approve router for token spends
      let approvalTx = await this.getApproveRouterSpendTx(
        order.inputCollateral.address,
        provider,
        order.inputCollateralAmount!
      );
      if (approvalTx) {
        txs.push(approvalTx);
      }
    }

    const tokenAddressString = this.getTokenAddressString(
      order.inputCollateral.address
    );

    let createOrderTx: UnsignedTransaction;
    if (order.type == "LIMIT_INCREASE") {
      const orderBook = OrderBook__factory.connect(
        getContract(ARBITRUM, "OrderBook")!,
        provider
      );

      const path: string[] = [];
      path.push(tokenAddressString);

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
    } else if (order.type == "MARKET_INCREASE") {
      const positionRouter = PositionRouter__factory.connect(
        getContract(ARBITRUM, "PositionRouter")!,
        provider
      );

      const path: string[] = [];
      path.push(tokenAddressString);
      if (order.direction == "LONG") {
        if (tokenAddressString != market.indexOrIdentifier) {
          path.push(market.indexOrIdentifier);
        }
      } else {
        if (tokenAddressString != this.shortTokenAddress) {
          path.push(this.shortTokenAddress);
        }
      }

      const acceptablePrice =
        order.slippage && order.slippage != ""
          ? applySlippage(
              order.trigger?.triggerPrice!,
              order.slippage,
              order.direction == "LONG"
            )
          : order.trigger?.triggerPrice!;

      if (order.inputCollateral.address != ethers.constants.AddressZero) {
        createOrderTx =
          await positionRouter.populateTransaction.createIncreasePosition(
            path,
            market.indexOrIdentifier,
            order.inputCollateralAmount,
            0,
            order.sizeDelta,
            order.direction == "LONG" ? true : false,
            acceptablePrice,
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
            acceptablePrice,
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
    }

    txs.push({
      tx: createOrderTx!, sessionKeyData: { module: "GMX_V1", sender: this.swAddr }, addtionalSessionData: undefined
    });

    return txs;
  }

  async updateOrder(
    provider: Provider,
    market: ExtendedMarket | undefined,
    updatedOrder: Partial<ExtendedOrder>
  ): Promise<UnsignedTxWithMetadata[]> {
    const orderBook = OrderBook__factory.connect(
      getContract(ARBITRUM, "OrderBook")!,
      provider
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
      updateOrderTx = await orderBook.populateTransaction.updateDecreaseOrder(
        updatedOrder.orderIdentifier!,
        updatedOrder.inputCollateralAmount!,
        updatedOrder.sizeDelta!,
        updatedOrder.trigger?.triggerPrice!,
        updatedOrder.trigger?.triggerAboveThreshold!
      );
    } else {
      throw new Error("Invalid order type");
    }

    return [{ tx: updateOrderTx, sessionKeyData: { module: "GMX_V1" }, addtionalSessionData: undefined }];
  }

  async cancelOrder(
    provider: Provider,
    market: Market | undefined,
    order: Partial<ExtendedOrder>
  ): Promise<UnsignedTxWithMetadata[]> {
    const orderBook = OrderBook__factory.connect(
      getContract(ARBITRUM, "OrderBook")!,
      provider
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

    return [{ tx: cancelOrderTx, sessionKeyData: { module: "GMX_V1" }, addtionalSessionData: undefined }];
  }

  getOrder(
    user: string,
    orderIdentifier: BigNumberish,
    market: ExtendedMarket
  ): Promise<ExtendedOrder> {
    throw new Error("Method not implemented.");
  }

  // @timer()
  async getAllOrders(
    user: string,
    provider: Provider
  ): Promise<ExtendedOrder[]> {
    const eos: ExtendedOrder[] = [];

    // TODO - Filter the market orders
    const orders = await this.getAccountOrders(user, provider);
    orders.forEach((order) => {
      let isIncrease = order.type == "Increase";
      let collateralToken;
      let collateralAmount;
      if (isIncrease) {
        collateralToken = this.convertToToken(
          getToken(ARBITRUM, order.purchaseToken)
        );
        collateralAmount = order.purchaseTokenAmount as BigNumber;
      } else {
        collateralToken = this.convertToToken(
          getToken(ARBITRUM, order.collateralToken)
        );
        collateralAmount = order.collateralDelta as BigNumber;
      }

      let isTp = false;
      let isSl = false;
      let triggerType: TRIGGER_TYPE;
      if (!isIncrease) {
        if (order.isLong) {
          isTp = order.triggerAboveThreshold as boolean;
        } else {
          isTp = !order.triggerAboveThreshold as boolean;
        }
        isSl = !isTp;
        triggerType = isTp ? "TAKE_PROFIT" : "STOP_LOSS";
      } else {
        triggerType = "NONE";
      }

      eos.push({
        orderAction: "CREATE",
        orderIdentifier: order.index as number,
        type: order.type == "Increase" ? "LIMIT_INCREASE" : "LIMIT_DECREASE",
        direction: order.isLong ? "LONG" : "SHORT",
        sizeDelta: order.sizeDelta as BigNumber,
        referralCode: undefined,
        isTriggerOrder: order.type == "Decrease",
        trigger: {
          triggerPrice: order.triggerPrice as BigNumber,
          triggerAboveThreshold: order.triggerAboveThreshold as boolean,
        },
        slippage: undefined,
        ...{
          inputCollateral: collateralToken,
          inputCollateralAmount: collateralAmount,
        },
        ...{
          indexOrIdentifier: order.indexToken as string,
          marketToken: this.convertToToken(
            getToken(ARBITRUM, order.indexToken as string)
          ),
          ...{
            triggerType: triggerType,
          },
        },
      });
    });

    return eos;
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
  ): Promise<ExtendedPosition> {
    throw new Error("Method not implemented.");
  }

  async getAllOrdersForPosition(
    user: string,
    provider: Provider,
    position: ExtendedPosition,
    openMarkers: OpenMarkets | undefined
  ): Promise<Array<ExtendedOrder>> {
    return (await this.getAllOrders(user, provider)).filter(
      (order) =>
        order.marketToken!.address == position.indexToken!.address &&
        order.direction == position.direction
    );
  }

  async getAllPositions(
    user: string,
    provider: Provider
  ): Promise<ExtendedPosition[]> {
    const reader = Reader__factory.connect(
      getContract(ARBITRUM, "Reader")!,
      provider
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
      provider,
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
        pnlwithoutfees: pos.delta,
        closeFee: pos.closingFee,
        swapFee: pos.swapFee,
        borrowFee: pos.fundingFee,
        positionFee: pos.positionFee,
        collateralAfterFee: pos.collateralAfterFee,
        delta: pos.delta,
        hasProfit: pos.hasProfit ?? true,
        marketIdentifier: this.getIndexTokenAddressFromPositionKey(pos.key),
        entryFundingRate: pos.entryFundingRate,
        cumulativeFundingRate: pos.cumulativeFundingRate,
        protocolMetadata: {
          protocolName: this.protocolIdentifier,
        },
      };

      extPositions.push(extP);
    }

    // console.log(extPositions)

    return extPositions;
  }

  async updatePositionMargin(
    provider: Provider,
    position: ExtendedPosition,
    marginAmount: BigNumber, // For deposit it's in token terms and for withdraw it's in USD terms (F/E)
    isDeposit: boolean,
    transferToken: Token
  ): Promise<UnsignedTxWithMetadata[]> {
    const positionRouter = PositionRouter__factory.connect(
      getContract(ARBITRUM, "PositionRouter")!,
      provider
    );
    let indexAddress = this.getIndexTokenAddressFromPositionKey(
      position.indexOrIdentifier
    );
    let fillPrice = await this.getMarketPriceByIndexAddress(indexAddress);
    let transferTokenString = this.getTokenAddressString(transferToken.address);

    const path: string[] = [];

    let marginTx: UnsignedTransaction;
    let txs: UnsignedTxWithMetadata[] = [];

    if (isDeposit) {
      //approve router for token spends
      if (transferToken.address !== ethers.constants.AddressZero) {
        let approvalTx = await this.getApproveRouterSpendTx(
          transferToken.address,
          provider,
          marginAmount
        );
        if (approvalTx) txs.push(approvalTx);
      }

      fillPrice =
        position.direction == "LONG"
          ? fillPrice.mul(101).div(100)
          : fillPrice.mul(99).div(100);

      if (transferTokenString !== position.collateralToken.address) {
        path.push(transferTokenString, position.collateralToken.address);
      } else {
        path.push(position.collateralToken.address);
      }

      if (transferToken.address == ethers.constants.AddressZero) {
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
              value: BigNumber.from(this.EXECUTION_FEE),
            }
          );
      }
    } else {
      path.push(position.collateralToken.address);
      if (transferTokenString !== position.collateralToken.address) {
        path.push(transferTokenString);
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
          transferToken.address == ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          {
            value: this.EXECUTION_FEE,
          }
        );
    }

    txs.push({ tx: marginTx, sessionKeyData: { module: "GMX_V1", sender: this.swAddr }, addtionalSessionData: undefined });

    return txs;
  }

  async closePosition(
    provider: Provider,
    position: ExtendedPosition,
    closeSize: BigNumber,
    isTrigger: boolean,
    triggerPrice: BigNumber | undefined,
    triggerAboveThreshold: boolean | undefined,
    outputToken: Token | undefined
  ): Promise<UnsignedTxWithMetadata[]> {
    let txs: UnsignedTxWithMetadata[] = [];
    let indexAddress = this.getIndexTokenAddressFromPositionKey(
      position.indexOrIdentifier
    );

    if (!isTrigger) {
      let remainingSize = position.size.sub(closeSize);

      // close all related tp/sl orders if order.sizeDelta > remaining size
      const orders = (
        await this.getAllOrdersForPosition(
          this.swAddr,
          provider,
          position,
          undefined
        )
      ).filter(
        (order) =>
          order.triggerType != "NONE" && order.sizeDelta > remainingSize
      );
      for (const order of orders) {
        const cancelOrderTx = await this.cancelOrder(
          provider,
          undefined,
          order
        );
        txs.push(...cancelOrderTx);
      }

      // close position
      let collateralOutAddr = outputToken
        ? outputToken.address
        : position.originalCollateralToken;

      let fillPrice = await this.getMarketPriceByIndexAddress(indexAddress);

      fillPrice =
        position.direction == "LONG"
          ? fillPrice.mul(99).div(100)
          : fillPrice.mul(101).div(100);

      const positionRouter = PositionRouter__factory.connect(
        getContract(ARBITRUM, "PositionRouter")!,
        provider
      );

      const path: string[] = [];
      path.push(position.collateralToken.address);
      if (collateralOutAddr !== position.collateralToken.address) {
        path.push(this.getTokenAddressString(collateralOutAddr!));
      }

      let createOrderTx =
        await positionRouter.populateTransaction.createDecreasePosition(
          path,
          indexAddress,
          BigNumber.from(0),
          closeSize,
          position.direction! == "LONG" ? true : false,
          this.swAddr,
          fillPrice,
          0,
          this.EXECUTION_FEE,
          collateralOutAddr == ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          {
            value: this.EXECUTION_FEE,
          }
        );
      txs.push({ tx: createOrderTx, sessionKeyData: { module: "GMX_V1", sender: this.swAddr }, addtionalSessionData: undefined });
    } else {
      const orderBook = OrderBook__factory.connect(
        getContract(ARBITRUM, "OrderBook")!,
        provider
      );

      let createOrderTx =
        await orderBook.populateTransaction.createDecreaseOrder(
          indexAddress,
          closeSize,
          position.originalCollateralToken!,
          BigNumber.from(0), // in USD e30
          position.direction == "LONG" ? true : false,
          triggerPrice!,
          triggerAboveThreshold!,
          {
            value: this.EXECUTION_FEE,
          }
        );
      txs.push({ tx: createOrderTx, sessionKeyData: { module: "GMX_V1", sender: this.swAddr }, addtionalSessionData: undefined });
    }

    return txs;
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

      if (params.feeBasisPoints && params.sizeDelta) {
        keeperFeesPaid = BigNumber.from(params.sizeDelta)
          .mul(params.feeBasisPoints)
          .div(10_000);
      }

      const t: TradeHistory = {
        marketIdentifier: { indexOrIdentifier: each.id },
        timestamp: each.data.timestamp,
        operation: each.data.action,
        sizeDelta: params.order?.sizeDelta || params.sizeDelta || params.size,
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

  async getLiquidationsHistory(
    user: string,
    openMarkers: OpenMarkets | undefined
  ): Promise<TradeHistory[]> {
    let url = `${getServerBaseUrl(ARBITRUM)}/actions?account=${user}`;
    const data = await (await fetch(url)).json();

    const trades: TradeHistory[] = [];

    for (const each of data) {
      const params = JSON.parse(each.data.params);

      const isLong = params.order?.isLong || params.isLong;

      let keeperFeesPaid = undefined;

      if (params.feeBasisPoints && params.sizeDelta) {
        keeperFeesPaid = BigNumber.from(params.sizeDelta)
          .mul(params.feeBasisPoints)
          .div(10_000);
      }

      const t: TradeHistory = {
        marketIdentifier: { indexOrIdentifier: each.id },
        timestamp: each.data.timestamp,
        operation: each.data.action,
        sizeDelta: params.order?.sizeDelta || params.sizeDelta || params.size,
        direction:
          typeof isLong === "undefined"
            ? isLong
            : isLong === true
            ? "LONG"
            : "SHORT",
        price:
          params.order?.acceptablePrice ||
          params.order?.triggerPrice ||
          params.acceptablePrice ||
          params.price ||
          params.markPrice,
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

    return trades.filter((t) =>
      t.operation.toLowerCase().includes("liquidate")
    );
  }

  getIdleMargins(user: string): Promise<(MarketIdentifier & CollateralData)[]> {
    throw new Error("Method not implemented.");
  }

  async checkTradePathLiquidity(
    user: string,
    provider: Provider,
    market: ExtendedMarket,
    order: Order,
    existingPosition: ExtendedPosition | undefined
  ): Promise<ViewError> {
    return await checkTradePathLiquidiytInternal(
      provider,
      market,
      this.getMarketPrice,
      order
    );
  }

  async getTradePreview(
    user: string,
    provider: Provider,
    market: ExtendedMarket,
    order: Order,
    existingPosition: ExtendedPosition | undefined
  ): Promise<ExtendedPosition> {
    return await getTradePreviewInternal(
      user,
      provider,
      market,
      this.getMarketPrice,
      this.convertToToken,
      order,
      BigNumber.from(this.EXECUTION_FEE),
      existingPosition
    );
  }

  async getCloseTradePreview(
    user: string,
    provider: Provider,
    position: ExtendedPosition,
    closeSize: BigNumber,
    isTrigger: boolean,
    triggerPrice: BigNumber | undefined,
    triggerAboveThreshold: boolean | undefined,
    outputToken: Token | undefined
  ): Promise<ExtendedPosition> {
    return await getCloseTradePreviewInternal(
      provider,
      position,
      closeSize,
      BigNumber.from(this.EXECUTION_FEE),
      isTrigger,
      triggerPrice,
      outputToken ? this.convertToGToken(outputToken) : undefined,
      this.convertToToken
    );
  }

  async getEditCollateralPreview(
    user: string,
    provider: Provider,
    position: ExtendedPosition,
    marginDelta: ethers.BigNumber,
    isDeposit: boolean
  ): Promise<ExtendedPosition> {
    return await getEditCollateralPreviewInternal(
      provider,
      position,
      marginDelta,
      isDeposit,
      this.convertToToken,
      BigNumber.from(this.EXECUTION_FEE)
    );
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

  convertToGToken(inToken: Token): GToken {
    let token: GToken = {
      address: inToken.address,
      decimals: Number(inToken.decimals),
      symbol: inToken.symbol,
      name: inToken.name,
    };
    return token;
  }

  ////////// HELPERS ////////////
  // @timer()
  async getAccountOrders(account: string, provider: Provider) {
    const orderBookAddress = getContract(ARBITRUM, "OrderBook")!;
    const orderBookReaderAddress = getContract(ARBITRUM, "OrderBookReader")!;

    const orderBookContract = OrderBook__factory.connect(
      orderBookAddress,
      provider
    );
    const orderBookReaderContract = OrderBookReader__factory.connect(
      orderBookReaderAddress,
      provider
    );

    const fetchIndexesFromServer = () => {
      const ordersIndexesUrl = `${getServerBaseUrl(
        ARBITRUM
      )}/orders_indices?account=${account}`;
      return fetch(ordersIndexesUrl)
        .then(async (res) => {
          const json = await res.json();
          const ret: {
            [index: string]: Array<{
              _type: string;
              val: string;
            }>;
          } = {};
          for (const key of Object.keys(json)) {
            ret[key.toLowerCase()] = json[key]
              .map((val: { value: string }) => parseInt(val.value))
              .sort((a: number, b: number) => a - b);
          }

          // console.dir(ret, { depth: 10 });
          return ret;
        })
        .catch(() => ({ swap: [], increase: [], decrease: [] }));
    };

    const fetchLastIndexes = async () => {
      const [increase, decrease] = await Promise.all([
        (await orderBookContract.increaseOrdersIndex(account)).toNumber(),
        (await orderBookContract.increaseOrdersIndex(account)).toNumber(),
      ]);

      return { increase, decrease };
    };

    const getRange = (to: number, from?: number) => {
      const LIMIT = 10;
      const _indexes: number[] = [];
      from = from || Math.max(to - LIMIT, 0);
      for (let i = to - 1; i >= from; i--) {
        _indexes.push(i);
      }
      return _indexes;
    };

    const getIndexes = (knownIndexes: number[], lastIndex: number) => {
      if (knownIndexes.length === 0) {
        return getRange(lastIndex);
      }
      return [
        ...knownIndexes,
        ...getRange(lastIndex, knownIndexes[knownIndexes.length - 1] + 1).sort(
          (a, b) => b - a
        ),
      ];
    };

    const getIncreaseOrders = async (
      knownIndexes: number[],
      lastIndex: number,
      parseFunc: (
        arg1: [ethers.BigNumber[], string[]],
        arg2: string,
        arg3: number[]
      ) => any[]
    ) => {
      const indexes = getIndexes(knownIndexes, lastIndex);
      const ordersData = await orderBookReaderContract.getIncreaseOrders(
        orderBookAddress,
        account,
        indexes
      );
      const orders = parseFunc(ordersData, account, indexes);

      return orders;
    };

    const getDecreaseOrders = async (
      knownIndexes: number[],
      lastIndex: number,
      parseFunc: (
        arg1: [ethers.BigNumber[], string[]],
        arg2: string,
        arg3: number[]
      ) => any[]
    ) => {
      const indexes = getIndexes(knownIndexes, lastIndex);
      const ordersData = await orderBookReaderContract.getDecreaseOrders(
        orderBookAddress,
        account,
        indexes
      );
      const orders = parseFunc(ordersData, account, indexes);

      return orders;
    };

    function _parseOrdersData(
      ordersData: [ethers.BigNumber[], string[]],
      account: string,
      indexes: number[],
      extractor: any,
      uintPropsLength: number,
      addressPropsLength: number
    ) {
      if (!ordersData) {
        return [];
      }
      const [uintProps, addressProps] = ordersData;
      const count = uintProps.length / uintPropsLength;

      const orders: any[] = [];
      for (let i = 0; i < count; i++) {
        const sliced = addressProps
          .slice(addressPropsLength * i, addressPropsLength * (i + 1))
          .map((prop) => prop as any)
          .concat(
            uintProps.slice(uintPropsLength * i, uintPropsLength * (i + 1))
          );

        if (
          (sliced[0] as string) === ethers.constants.AddressZero &&
          (sliced[1] as string) === ethers.constants.AddressZero
        ) {
          continue;
        }

        const order = extractor(sliced);
        order.index = indexes[i];
        order.account = account;
        orders.push(order);
      }

      return orders;
    }

    function parseDecreaseOrdersData(
      decreaseOrdersData: [ethers.BigNumber[], string[]],
      account: string,
      indexes: number[]
    ) {
      const extractor = (sliced: any[]) => {
        const isLong = sliced[4].toString() === "1";
        return {
          collateralToken: sliced[0] as string,
          indexToken: sliced[1] as string,
          collateralDelta: sliced[2] as BigNumber,
          sizeDelta: sliced[3] as BigNumber,
          isLong,
          triggerPrice: sliced[5] as BigNumber,
          triggerAboveThreshold: sliced[6].toString() === "1",
          type: "Decrease",
        };
      };
      return _parseOrdersData(
        decreaseOrdersData,
        account,
        indexes,
        extractor,
        5,
        2
      );
    }

    function parseIncreaseOrdersData(
      increaseOrdersData: [ethers.BigNumber[], string[]],
      account: string,
      indexes: number[]
    ) {
      const extractor = (sliced: any[]) => {
        const isLong = sliced[5].toString() === "1";
        return {
          purchaseToken: sliced[0] as string,
          collateralToken: sliced[1] as string,
          indexToken: sliced[2] as string,
          purchaseTokenAmount: sliced[3] as BigNumber,
          sizeDelta: sliced[4] as BigNumber,
          isLong,
          triggerPrice: sliced[6] as BigNumber,
          triggerAboveThreshold: sliced[7].toString() === "1",
          type: "Increase",
        };
      };
      return _parseOrdersData(
        increaseOrdersData,
        account,
        indexes,
        extractor,
        5,
        3
      );
    }

    const [serverIndexes, lastIndexes]: any = await Promise.all([
      fetchIndexesFromServer(),
      fetchLastIndexes(),
    ]);
    const [increaseOrders = [], decreaseOrders = []] = await Promise.all([
      getIncreaseOrders(
        serverIndexes.increase,
        lastIndexes.increase,
        parseIncreaseOrdersData
      ),
      getDecreaseOrders(
        serverIndexes.decrease,
        lastIndexes.decrease,
        parseDecreaseOrdersData
      ),
    ]);
    // increaseOrders.forEach((io: any) => {
    //   logObject("io", io);
    // });
    // decreaseOrders.forEach((dor: any) => {
    //   logObject("do", dor);
    // });

    return [...increaseOrders, ...decreaseOrders];
  }
}
