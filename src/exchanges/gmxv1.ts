import { UnsignedTransaction, BigNumberish, ethers, BigNumber } from 'ethers'
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
  LiquidationHistory,
  PaginatedRes,
  PageOptions
} from '../interface'
import {
  IERC20__factory,
  OrderBookReader__factory,
  OrderBook__factory,
  PositionRouter__factory,
  Reader__factory,
  ReferralStorage__factory,
  Router__factory
} from '../../typechain/gmx-v1/'
import { getContract } from '../configs/gmx/contracts'
import { ARBITRUM, getConstant } from '../configs/gmx/chains'
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
  getTokenAmountFromUsd,
  getUsd
} from '../configs/gmx/tokens'
import { applySlippage, getPaginatedResponse, logObject, toNumberDecimal } from '../common/helper'
import { timer } from 'execution-time-decorators'
import { parseUnits } from 'ethers/lib/utils'
import { ApiOpts } from '../interfaces/V1/IRouterAdapterBaseV1'
import { CACHE_SECOND, CACHE_TIME_MULT, GMXV1_CACHE_PREFIX, cacheFetch, getStaleTime } from '../common/cache'
import { ZERO } from '../common/constants'

// taken from contract Vault.sol
const LIQUIDATION_FEE_USD = BigNumber.from('5000000000000000000000000000000')

export default class GmxV1Service implements IExchange {
  private REFERRAL_CODE = '0x7261676574726164650000000000000000000000000000000000000000000000'
  // taking as DECREASE_ORDER_EXECUTION_GAS_FEE because it is highest and diff is miniscule
  private EXECUTION_FEE = getConstant(ARBITRUM, 'DECREASE_ORDER_EXECUTION_GAS_FEE')! as BigNumber
  private protocolIdentifier: PROTOCOL_NAME = 'GMX_V1'
  private nativeTokenAddress = getContract(ARBITRUM, 'NATIVE_TOKEN')!
  private shortTokenAddress = getTokenBySymbol(ARBITRUM, 'USDC.e')!.address
  private whitelistedTokens = getWhitelistedTokens(ARBITRUM)
  private isPluginApprovedMap: Record<string, boolean> = {}
  private indexTokens = this.whitelistedTokens
    .filter((token) => !token.isStable && !token.isWrapped)
    .map((token) => {
      let tokenIn: Token = {
        address: token.address,
        decimals: token.decimals.toString(),
        symbol: token.symbol,
        name: token.name
      }
      return tokenIn
    })
  private collateralTokens = this.whitelistedTokens
    .filter((token) => !token.isTempHidden)
    .map((token) => {
      let tokenIn: Token = {
        address: token.address,
        decimals: token.decimals.toString(),
        symbol: token.symbol,
        name: token.name
      }
      return tokenIn
    })

  async getDynamicMetadata(market: ExtendedMarket, provider: Provider, opts?: ApiOpts): Promise<DynamicMarketMetadata> {
    const reader = Reader__factory.connect(getContract(ARBITRUM, 'Reader')!, provider)

    const nativeTokenAddress = getContract(ARBITRUM, 'NATIVE_TOKEN')
    const whitelistedTokens = V1_TOKENS[ARBITRUM]
    const tokenAddresses = whitelistedTokens.map((x) => x.address)

    const sTimeFI = getStaleTime(CACHE_SECOND * 30, opts)
    const fundingRateInfo = await cacheFetch({
      key: [
        GMXV1_CACHE_PREFIX,
        'getFundingRates',
        nativeTokenAddress!,
        tokenAddresses.join('-'),
        getContract(ARBITRUM, 'Vault')!
      ],
      fn: () => reader.getFundingRates(getContract(ARBITRUM, 'Vault')!, nativeTokenAddress!, tokenAddresses),
      staleTime: sTimeFI,
      cacheTime: sTimeFI * CACHE_TIME_MULT,
      opts
    })

    const { infoTokens } = await useInfoTokens(provider, ARBITRUM, false, [BigNumber.from(0)], fundingRateInfo)

    const info = infoTokens[market.marketToken?.address!]
    const longTokenInfo = infoTokens[market.marketToken?.address!]
    const shortTokenInfo = infoTokens[getTokenBySymbol(ARBITRUM, 'USDC.e')!.address]

    return {
      oiLongUsd: info.guaranteedUsd!,
      oiShortUsd: info.globalShortSize!,
      fundingRate: BigNumber.from(0),
      borrowRate: fundingRateInfo[0],
      availableLiquidityLongUSD: info.maxAvailableLong,
      availableLiquidityShortUSD: info.maxAvailableShort,
      marketLimitUsd: BigNumber.from(0),
      marketLimitNative: BigNumber.from(0),
      borrowRateLong: longTokenInfo.fundingRate,
      borrowRateShort: shortTokenInfo.fundingRate
    }
  }

  invariant(condition: any, errorMsg: string | undefined) {
    if (!condition) {
      throw new Error(errorMsg)
    }
  }

  async setup(provider: Provider): Promise<UnsignedTxWithMetadata[]> {
    return Promise.resolve([])
  }

  async getReferralAndPluginApprovals(provider: Provider, wallet: string): Promise<UnsignedTxWithMetadata[]> {
    let txs: UnsignedTxWithMetadata[] = []

    // check and set referral code
    const referralCodeTxsPromise = this.checkAndSetReferralCodeTx(provider, wallet)

    // check and set plugin approvals
    const pluginApprovalTxsPromise = this.checkAndGetPluginApprovalTxs(provider, wallet)

    const [referralCodeTxs, pluginApprovalTxs] = await Promise.all([referralCodeTxsPromise, pluginApprovalTxsPromise])

    txs.push(...referralCodeTxs)
    txs.push(...pluginApprovalTxs)

    return txs
  }

  async checkAndGetPluginApprovalTxs(provider: Provider, wallet: string): Promise<UnsignedTxWithMetadata[]> {
    let txs: UnsignedTxWithMetadata[] = []

    // fetch approval status from cache
    if (this.isPluginApprovedMap[wallet]) {
      return txs
    }

    // check whether plugins are approved or not
    const router = Router__factory.connect(getContract(ARBITRUM, 'Router')!, provider)
    const orderBook = getContract(ARBITRUM, 'OrderBook')!
    const positionRouter = getContract(ARBITRUM, 'PositionRouter')!

    const obApprovalPromise = router.approvedPlugins(wallet, orderBook)
    const prApprovalPromise = router.approvedPlugins(wallet, positionRouter)

    const [obApproval, prApproval] = await Promise.all([obApprovalPromise, prApprovalPromise])

    if (!obApproval) {
      const approveOrderBookTx = await router.populateTransaction.approvePlugin(orderBook)
      txs.push({
        tx: approveOrderBookTx,
        type: 'GMX_V1',
        data: undefined,
        heading: 'Approve OrderBook',
        desc: 'Approve OrderBook'
      })
    }

    if (!prApproval) {
      const approvePositionRouterTx = await router.populateTransaction.approvePlugin(positionRouter)
      txs.push({
        tx: approvePositionRouterTx,
        type: 'GMX_V1',
        data: undefined,
        heading: 'Approve PositionRouter',
        desc: 'Approve PositionRouter'
      })
    }

    // update cache if both plugins are approved already
    if (obApproval && prApproval) {
      this.isPluginApprovedMap[wallet] = true
    }

    return txs
  }

  async checkAndSetReferralCodeTx(provider: Provider, wallet: string): Promise<UnsignedTxWithMetadata[]> {
    let txs: UnsignedTxWithMetadata[] = []
    const referralStorage = ReferralStorage__factory.connect(getContract(ARBITRUM, 'ReferralStorage')!, provider)

    // Fetch user referral code
    const code = await referralStorage.traderReferralCodes(wallet)

    if (code.toLowerCase() != this.REFERRAL_CODE.toLowerCase()) {
      // set referral code
      const setReferralCodeTx = await referralStorage.populateTransaction.setTraderReferralCodeByUser(
        this.REFERRAL_CODE
      )
      txs.push({
        tx: setReferralCodeTx,
        type: 'GMX_V1',
        data: undefined,
        heading: 'Set Referral Code',
        desc: 'Set Referral Code'
      })
    }

    return txs
  }

  async getApproveRouterSpendTx(
    tokenAddress: string,
    provider: Provider,
    allowanceAmount: BigNumber,
    wallet: string
  ): Promise<UnsignedTxWithMetadata | undefined> {
    let token = IERC20__factory.connect(tokenAddress, provider)
    const router = getContract(ARBITRUM, 'Router')!

    let allowance = await token.allowance(wallet, router)

    if (allowance.lt(allowanceAmount)) {
      let tx = await token.populateTransaction.approve(router, ethers.constants.MaxUint256)
      return {
        tx,
        type: 'ERC20_APPROVAL',
        data: { chainId: ARBITRUM, spender: router, token: tokenAddress },
        heading: 'Approve Router Spend',
        desc: 'Approve Router Spend'
      }
    }
  }

  supportedNetworks(): readonly Network[] {
    const networks: Network[] = []
    networks.push({
      name: 'arbitrum',
      chainId: ARBITRUM
    })
    return networks
  }

  async supportedMarkets(network: Network): Promise<ExtendedMarket[]> {
    let markets: ExtendedMarket[] = []

    this.indexTokens.forEach((indexToken) => {
      markets.push({
        mode: 'ASYNC',
        longCollateral: this.collateralTokens,
        shortCollateral: this.collateralTokens,
        supportedOrderTypes: {
          LIMIT_INCREASE: true,
          LIMIT_DECREASE: true,
          MARKET_INCREASE: true,
          MARKET_DECREASE: true,
          DEPOSIT: false,
          WITHDRAW: false
        },
        supportedOrderActions: {
          CREATE: true,
          UPDATE: true,
          CANCEL: true
        },
        asset: indexToken.symbol,
        indexOrIdentifier: this.getTokenAddress(indexToken),
        marketToken: indexToken,
        minLeverage: toNumberDecimal(parseUnits('1.1', 4), 4),
        maxLeverage: toNumberDecimal(parseUnits('50', 4), 4),
        minInitialMargin: toNumberDecimal(parseUnits('11', 30), 30),
        protocolName: this.protocolIdentifier,
        minPositionSize: toNumberDecimal(parseUnits('10', 30), 30)
      })
    })

    return markets
  }

  async getMarketPrice(market: ExtendedMarket): Promise<NumberDecimal> {
    const indexPricesUrl = getServerUrl(ARBITRUM, '/prices')
    const response = await fetch(indexPricesUrl)
    const jsonResponse = await response.json()
    // console.dir(jsonResponse, { depth: 10 });

    const indexPrice = jsonResponse[market.indexOrIdentifier]

    return {
      value: bigNumberify(indexPrice)!.toString(),
      decimals: USD_DECIMALS
    }
  }

  async getMarketPriceByIndexAddress(indexAddr: string): Promise<BigNumber> {
    const indexPricesUrl = getServerUrl(ARBITRUM, '/prices')
    const response = await fetch(indexPricesUrl)
    const jsonResponse = await response.json()
    // console.dir(jsonResponse, { depth: 10 });

    const indexPrice = jsonResponse[indexAddr]

    return bigNumberify(indexPrice)!
  }

  async createOrder(
    provider: Provider,
    market: ExtendedMarket,
    order: Order,
    wallet: string
  ): Promise<UnsignedTxWithMetadata[]> {
    let txs: UnsignedTxWithMetadata[] = []

    // check for referral and plugin approvals
    txs.push(...(await this.getReferralAndPluginApprovals(provider, wallet)))

    // approval tx
    if (
      (order.type == 'LIMIT_INCREASE' || order.type == 'MARKET_INCREASE') &&
      order.inputCollateral.address != ethers.constants.AddressZero
    ) {
      //approve router for token spends
      let approvalTx = await this.getApproveRouterSpendTx(
        order.inputCollateral.address,
        provider,
        order.inputCollateralAmount!,
        wallet
      )
      if (approvalTx) {
        txs.push(approvalTx)
      }
    }

    const tokenAddressString = this.getTokenAddressString(order.inputCollateral.address)

    let createOrderTx: UnsignedTransaction
    let extraEthReq = BigNumber.from(0)
    if (order.type == 'LIMIT_INCREASE') {
      const orderBook = OrderBook__factory.connect(getContract(ARBITRUM, 'OrderBook')!, provider)

      const path: string[] = []
      path.push(tokenAddressString)

      const isEthCollateral = order.inputCollateral.address == ethers.constants.AddressZero

      if (isEthCollateral) {
        extraEthReq = order.inputCollateralAmount
      }

      createOrderTx = await orderBook.populateTransaction.createIncreaseOrder(
        path,
        order.inputCollateralAmount,
        market.indexOrIdentifier,
        0,
        order.sizeDelta,
        market.indexOrIdentifier,
        order.direction == 'LONG' ? true : false,
        order.trigger?.triggerPrice!,
        !(order.direction == 'LONG'),
        this.EXECUTION_FEE,
        isEthCollateral,
        {
          value: isEthCollateral ? this.EXECUTION_FEE.add(order.inputCollateralAmount) : this.EXECUTION_FEE
        }
      )
    } else if (order.type == 'MARKET_INCREASE') {
      const positionRouter = PositionRouter__factory.connect(getContract(ARBITRUM, 'PositionRouter')!, provider)

      const path: string[] = []
      path.push(tokenAddressString)
      if (order.direction == 'LONG') {
        if (tokenAddressString != market.indexOrIdentifier) {
          path.push(market.indexOrIdentifier)
        }
      } else {
        if (tokenAddressString != this.shortTokenAddress) {
          path.push(this.shortTokenAddress)
        }
      }

      const acceptablePrice =
        order.slippage && order.slippage != ''
          ? applySlippage(order.trigger?.triggerPrice!, Number(order.slippage), order.direction == 'LONG')
          : order.trigger?.triggerPrice!

      if (order.inputCollateral.address != ethers.constants.AddressZero) {
        createOrderTx = await positionRouter.populateTransaction.createIncreasePosition(
          path,
          market.indexOrIdentifier,
          order.inputCollateralAmount,
          0,
          order.sizeDelta,
          order.direction == 'LONG' ? true : false,
          acceptablePrice,
          this.EXECUTION_FEE,
          ethers.constants.HashZero, // Referral code set during setup()
          ethers.constants.AddressZero,
          {
            value: this.EXECUTION_FEE
          }
        )
      } else {
        extraEthReq = order.inputCollateralAmount

        createOrderTx = await positionRouter.populateTransaction.createIncreasePositionETH(
          path,
          market.indexOrIdentifier,
          0,
          order.sizeDelta,
          order.direction == 'LONG' ? true : false,
          acceptablePrice,
          this.EXECUTION_FEE,
          ethers.constants.HashZero, // Referral code set during setup()
          ethers.constants.AddressZero,
          {
            value: this.EXECUTION_FEE.add(order.inputCollateralAmount)
          }
        )
      }
    }

    txs.push({
      tx: createOrderTx!,
      type: 'GMX_V1',
      data: undefined,
      ethRequired: await this.getEthRequired(provider, extraEthReq, wallet),
      heading: 'Create Order',
      desc: 'Create Order'
    })

    return txs
  }

  async updateOrder(
    provider: Provider,
    market: ExtendedMarket | undefined,
    updatedOrder: Partial<ExtendedOrder>,
    wallet: string
  ): Promise<UnsignedTxWithMetadata[]> {
    let txs: UnsignedTxWithMetadata[] = []

    // check for referral and plugin approvals
    txs.push(...(await this.getReferralAndPluginApprovals(provider, wallet)))

    const orderBook = OrderBook__factory.connect(getContract(ARBITRUM, 'OrderBook')!, provider)

    let updateOrderTx

    if (updatedOrder.type! == 'LIMIT_INCREASE') {
      updateOrderTx = await orderBook.populateTransaction.updateIncreaseOrder(
        updatedOrder.orderIdentifier!,
        updatedOrder.sizeDelta!,
        updatedOrder.trigger?.triggerPrice!,
        updatedOrder.trigger?.triggerAboveThreshold!
      )
    } else if (updatedOrder.type! == 'LIMIT_DECREASE') {
      updateOrderTx = await orderBook.populateTransaction.updateDecreaseOrder(
        updatedOrder.orderIdentifier!,
        updatedOrder.inputCollateralAmount!,
        updatedOrder.sizeDelta!,
        updatedOrder.trigger?.triggerPrice!,
        updatedOrder.trigger?.triggerAboveThreshold!
      )
    } else {
      throw new Error('Invalid order type')
    }

    txs.push({
      tx: updateOrderTx,
      type: 'GMX_V1',
      data: undefined,
      heading: 'Update Order',
      desc: 'Update Order'
    })

    return txs
  }

  async cancelOrder(
    provider: Provider,
    market: Market | undefined,
    order: Partial<ExtendedOrder>,
    wallet: string
  ): Promise<UnsignedTxWithMetadata[]> {
    let txs: UnsignedTxWithMetadata[] = []

    // check for referral and plugin approvals
    txs.push(...(await this.getReferralAndPluginApprovals(provider, wallet)))

    const orderBook = OrderBook__factory.connect(getContract(ARBITRUM, 'OrderBook')!, provider)
    let cancelOrderTx

    if (order.type! == 'LIMIT_INCREASE') {
      cancelOrderTx = await orderBook.populateTransaction.cancelIncreaseOrder(order.orderIdentifier!)
    } else if (order.type! == 'LIMIT_DECREASE') {
      cancelOrderTx = await orderBook.populateTransaction.cancelDecreaseOrder(order.orderIdentifier!)
    } else {
      throw new Error('Invalid order type')
    }

    txs.push({
      tx: cancelOrderTx,
      type: 'GMX_V1',
      data: undefined,
      heading: 'Cancel Order',
      desc: 'Cancel Order'
    })

    return txs
  }

  getOrder(user: string, orderIdentifier: BigNumberish, market: ExtendedMarket): Promise<ExtendedOrder> {
    throw new Error('Method not implemented.')
  }

  // @timer()
  async getAllOrders(
    user: string,
    provider: Provider,
    openMarkers: OpenMarkets | undefined,
    pageOptions: PageOptions | undefined
  ): Promise<PaginatedRes<ExtendedOrder>> {
    const eos: ExtendedOrder[] = []

    // TODO - Filter the market orders
    const orders = await this.getAccountOrders(user, provider)
    orders.forEach((order) => {
      let isIncrease = order.type == 'Increase'
      let collateralToken
      let collateralAmount
      if (isIncrease) {
        collateralToken = this.convertToToken(getToken(ARBITRUM, order.purchaseToken))
        collateralAmount = order.purchaseTokenAmount as BigNumber
      } else {
        collateralToken = this.convertToToken(getToken(ARBITRUM, order.collateralToken))
        collateralAmount = order.collateralDelta as BigNumber
      }

      let isTp = false
      let isSl = false
      let triggerType: TRIGGER_TYPE
      if (!isIncrease) {
        if (order.isLong) {
          isTp = order.triggerAboveThreshold as boolean
        } else {
          isTp = !order.triggerAboveThreshold as boolean
        }
        isSl = !isTp
        triggerType = isTp ? 'TAKE_PROFIT' : 'STOP_LOSS'
      } else {
        triggerType = 'NONE'
      }

      eos.push({
        orderAction: 'CREATE',
        orderIdentifier: order.index as number,
        type: order.type == 'Increase' ? 'LIMIT_INCREASE' : 'LIMIT_DECREASE',
        direction: order.isLong ? 'LONG' : 'SHORT',
        sizeDelta: order.sizeDelta as BigNumber,
        referralCode: undefined,
        isTriggerOrder: order.type == 'Decrease',
        trigger: {
          triggerPrice: order.triggerPrice as BigNumber,
          triggerAboveThreshold: order.triggerAboveThreshold as boolean
        },
        slippage: undefined,
        ...{
          inputCollateral: collateralToken,
          inputCollateralAmount: collateralAmount
        },
        ...{
          indexOrIdentifier: order.indexToken as string,
          marketToken: this.convertToToken(getToken(ARBITRUM, order.indexToken as string)),
          ...{
            triggerType: triggerType
          }
        }
      })
    })

    return getPaginatedResponse(eos, pageOptions)
  }

  getMarketOrders(user: string, market: ExtendedMarket): Promise<ExtendedOrder[]> {
    throw new Error('Method not implemented.')
  }

  getPosition(positionIdentifier: string, market: ExtendedMarket, user?: string): Promise<ExtendedPosition> {
    throw new Error('Method not implemented.')
  }

  async getAllOrdersForPosition(
    user: string,
    provider: Provider,
    position: ExtendedPosition,
    openMarkers: OpenMarkets | undefined
  ): Promise<Array<ExtendedOrder>> {
    const allOrders = (await this.getAllOrders(user, provider, undefined, undefined)).result as ExtendedOrder[]

    return allOrders.filter(
      (order) => order.marketToken!.address == position.indexToken!.address && order.direction == position.direction
    )
  }

  async getAllPositions(
    user: string,
    provider: Provider,
    openMarkers: OpenMarkets | undefined,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts
  ): Promise<PaginatedRes<ExtendedPosition>> {
    const reader = Reader__factory.connect(getContract(ARBITRUM, 'Reader')!, provider)

    const nativeTokenAddress = getContract(ARBITRUM, 'NATIVE_TOKEN')

    const whitelistedTokens = V1_TOKENS[ARBITRUM]
    const tokenAddresses = whitelistedTokens.map((x) => x.address)

    const positionQuery = getPositionQuery(
      whitelistedTokens as {
        address: string
        isStable: boolean
        isWrapped: boolean
      }[],
      nativeTokenAddress!
    )

    // console.log(positionQuery)

    const positionDataPromise = reader.getPositions(
      getContract(ARBITRUM, 'Vault')!,
      user,
      positionQuery.collateralTokens,
      positionQuery.indexTokens,
      positionQuery.isLong
    )

    let sTimeFR = getStaleTime(CACHE_SECOND * 10, opts)
    const fundingRateInfoPromise = cacheFetch({
      key: [
        GMXV1_CACHE_PREFIX,
        'getFundingRates',
        nativeTokenAddress!,
        tokenAddresses.join('-'),
        getContract(ARBITRUM, 'Vault')!
      ],
      fn: () => reader.getFundingRates(getContract(ARBITRUM, 'Vault')!, nativeTokenAddress!, tokenAddresses),
      staleTime: sTimeFR,
      cacheTime: sTimeFR * CACHE_TIME_MULT,
      opts
    })

    // console.log(fundingRateInfo)
    const [positionData, fundingRateInfo] = await Promise.all([positionDataPromise, fundingRateInfoPromise])

    const { infoTokens } = await useInfoTokens(provider, ARBITRUM, false, undefined, fundingRateInfo, undefined, opts)

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
    )

    let extPositions: ExtendedPosition[] = []

    for (const pos of positions) {
      const maxAmount: BigNumber = pos.collateralAfterFee.sub(MIN_ORDER_USD).gt(0)
        ? pos.collateralAfterFee.sub(MIN_ORDER_USD)
        : bigNumberify(0)

      // console.log({ maxAmount });

      const extP: ExtendedPosition = {
        indexOrIdentifier: pos.key, // account + collateral + index + isLong
        size: pos.size,
        collateral: pos.collateral,
        averageEntryPrice: pos.averagePrice,
        cumulativeFunding: pos.fundingFee,
        lastUpdatedAtTimestamp: pos.lastIncreasedTime,
        unrealizedPnl: pos.hasProfitAfterFees ? pos.pendingDeltaAfterFees : pos.pendingDeltaAfterFees.mul(-1),
        liqudationPrice: getLiquidationPrice({
          size: pos.size,
          collateral: pos.collateral,
          averagePrice: pos.averagePrice,
          isLong: pos.isLong,
          fundingFee: pos.fundingFee
        }),
        fee: pos.totalFees,
        accessibleMargin: maxAmount,
        accessibleMarginToken: getTokenAmountFromUsd(
          infoTokens,
          this.getCollateralTokenAddressFromPositionKey(pos.key),
          maxAmount
        ),
        leverage: pos.leverage,
        exceedsPriceProtection: pos.hasLowCollateral,
        direction: pos.isLong ? 'LONG' : 'SHORT',
        originalCollateralToken: pos.originalCollateralToken,
        indexToken: this.convertToToken(getToken(ARBITRUM, this.getIndexTokenAddressFromPositionKey(pos.key))),
        collateralToken: this.convertToToken(
          getToken(ARBITRUM, this.getCollateralTokenAddressFromPositionKey(pos.key))
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
          protocolName: this.protocolIdentifier
        }
      }

      extPositions.push(extP)
    }

    // console.log(extPositions)

    return getPaginatedResponse(extPositions, pageOptions)
  }

  async updatePositionMargin(
    provider: Provider,
    position: ExtendedPosition,
    marginAmount: BigNumber, // token terms
    isDeposit: boolean,
    transferToken: Token,
    wallet: string
  ): Promise<UnsignedTxWithMetadata[]> {
    let txs: UnsignedTxWithMetadata[] = []

    // check for referral and plugin approvals
    txs.push(...(await this.getReferralAndPluginApprovals(provider, wallet)))

    const positionRouter = PositionRouter__factory.connect(getContract(ARBITRUM, 'PositionRouter')!, provider)
    let indexAddress = this.getIndexTokenAddressFromPositionKey(position.indexOrIdentifier)
    let fillPrice = await this.getMarketPriceByIndexAddress(indexAddress)
    let transferTokenString = this.getTokenAddressString(transferToken.address)

    const path: string[] = []

    let marginTx: UnsignedTransaction
    let extraEthReq = BigNumber.from(0)

    if (isDeposit) {
      //approve router for token spends
      if (transferToken.address !== ethers.constants.AddressZero) {
        let approvalTx = await this.getApproveRouterSpendTx(transferToken.address, provider, marginAmount, wallet)
        if (approvalTx) txs.push(approvalTx)
      }

      fillPrice = position.direction == 'LONG' ? fillPrice.mul(101).div(100) : fillPrice.mul(99).div(100)

      if (transferTokenString !== position.collateralToken.address) {
        path.push(transferTokenString, position.collateralToken.address)
      } else {
        path.push(position.collateralToken.address)
      }

      if (transferToken.address == ethers.constants.AddressZero) {
        extraEthReq = marginAmount

        marginTx = await positionRouter.populateTransaction.createIncreasePositionETH(
          path,
          indexAddress,
          0,
          BigNumber.from(0),
          position.direction == 'LONG' ? true : false,
          fillPrice,
          this.EXECUTION_FEE,
          ethers.constants.HashZero, // Referral code set during setup()
          ethers.constants.AddressZero,
          {
            value: this.EXECUTION_FEE.add(marginAmount)
          }
        )
      } else {
        marginTx = await positionRouter.populateTransaction.createIncreasePosition(
          path,
          indexAddress,
          marginAmount,
          0,
          BigNumber.from(0),
          position.direction == 'LONG' ? true : false,
          fillPrice,
          this.EXECUTION_FEE,
          ethers.constants.HashZero, // Referral code set during setup()
          ethers.constants.AddressZero,
          {
            value: this.EXECUTION_FEE
          }
        )
      }
    } else {
      path.push(position.collateralToken.address)
      if (transferTokenString !== position.collateralToken.address) {
        path.push(transferTokenString)
      }

      fillPrice = position.direction == 'LONG' ? fillPrice.mul(99).div(100) : fillPrice.mul(101).div(100)
      const { infoTokens } = await useInfoTokens(provider, ARBITRUM, false)
      const marginAmountUSD = getUsd(marginAmount, transferTokenString, false, infoTokens)!

      marginTx = await positionRouter.populateTransaction.createDecreasePosition(
        path,
        indexAddress,
        marginAmountUSD,
        BigNumber.from(0),
        position.direction == 'LONG' ? true : false,
        wallet,
        fillPrice,
        0,
        this.EXECUTION_FEE,
        transferToken.address == ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        {
          value: this.EXECUTION_FEE
        }
      )
    }

    txs.push({
      tx: marginTx,
      type: 'GMX_V1',
      data: undefined,
      ethRequired: await this.getEthRequired(provider, extraEthReq, wallet),
      heading: 'Update Margin',
      desc: 'Update Margin'
    })

    return txs
  }

  async closePosition(
    provider: Provider,
    position: ExtendedPosition,
    closeSize: BigNumber,
    isTrigger: boolean,
    triggerPrice: BigNumber | undefined,
    triggerAboveThreshold: boolean | undefined,
    outputToken: Token | undefined,
    wallet: string
  ): Promise<UnsignedTxWithMetadata[]> {
    let txs: UnsignedTxWithMetadata[] = []

    // check for referral and plugin approvals
    txs.push(...(await this.getReferralAndPluginApprovals(provider, wallet)))

    let indexAddress = this.getIndexTokenAddressFromPositionKey(position.indexOrIdentifier)

    if (!isTrigger) {
      let remainingSize = position.size.sub(closeSize)

      // close all related tp/sl orders if order.sizeDelta > remaining size
      const orders = (await this.getAllOrdersForPosition(wallet, provider, position, undefined)).filter(
        (order) => order.triggerType != 'NONE' && order.sizeDelta.gt(remainingSize)
      )
      for (const order of orders) {
        const cancelOrderTx = await this.cancelOrder(provider, undefined, order, wallet)
        txs.push(...cancelOrderTx)
      }

      // close position
      let collateralOutAddr = outputToken ? outputToken.address : position.originalCollateralToken

      let fillPrice = await this.getMarketPriceByIndexAddress(indexAddress)

      fillPrice = position.direction == 'LONG' ? fillPrice.mul(99).div(100) : fillPrice.mul(101).div(100)

      const positionRouter = PositionRouter__factory.connect(getContract(ARBITRUM, 'PositionRouter')!, provider)

      const path: string[] = []
      path.push(position.collateralToken.address)
      if (collateralOutAddr !== position.collateralToken.address) {
        path.push(this.getTokenAddressString(collateralOutAddr!))
      }

      let createOrderTx = await positionRouter.populateTransaction.createDecreasePosition(
        path,
        indexAddress,
        BigNumber.from(0),
        closeSize,
        position.direction! == 'LONG' ? true : false,
        wallet,
        fillPrice,
        0,
        this.EXECUTION_FEE,
        collateralOutAddr == ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        {
          value: this.EXECUTION_FEE
        }
      )
      txs.push({
        tx: createOrderTx,
        type: 'GMX_V1',
        data: undefined,
        ethRequired: await this.getEthRequired(provider, undefined, wallet),
        heading: 'Close Position',
        desc: 'Close Position'
      })
    } else {
      const orderBook = OrderBook__factory.connect(getContract(ARBITRUM, 'OrderBook')!, provider)

      let createOrderTx = await orderBook.populateTransaction.createDecreaseOrder(
        indexAddress,
        closeSize,
        position.originalCollateralToken!,
        BigNumber.from(0), // in USD e30
        position.direction == 'LONG' ? true : false,
        triggerPrice!,
        triggerAboveThreshold!,
        {
          value: this.EXECUTION_FEE
        }
      )
      txs.push({
        tx: createOrderTx,
        type: 'GMX_V1',
        data: undefined,
        ethRequired: await this.getEthRequired(provider, undefined, wallet),
        heading: 'Close Position',
        desc: 'Close Position'
      })
    }

    return txs
  }

  getMarketPositions(user: string, market: string): Promise<Position[]> {
    throw new Error('Method not implemented.')
  }

  async getTradesHistory(
    user: string,
    _: OpenMarkets | undefined,
    pageOptions: PageOptions | undefined
  ): Promise<PaginatedRes<TradeHistory>> {
    const results = await fetch('https://api.thegraph.com/subgraphs/name/nissoh/gmx-arbitrum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          trades(first: 1000, where: {account: "${user.toLowerCase()}"}, orderBy: timestamp, orderDirection: desc ) {
            id
            key
            fee
            size
            isLong
            account
            sizeDelta
            timestamp
            collateral
            indexToken
            realisedPnl
            averagePrice
            collateralToken
            status
            increaseList {
              id
              key
              account
              collateralDelta
              collateralToken
              fee
              indexToken
              isLong
              price
              sizeDelta
              timestamp
            }
            decreaseList {
              id
              key
              account
              collateralDelta
              collateralToken
              fee
              indexToken
              isLong
              price
              sizeDelta
              timestamp
            }
            updateList {
              id
              key
              realisedPnl
              averagePrice
              collateral
              entryFundingRate
              markPrice
              reserveAmount
              size
              timestamp
            }
            closedPosition {
              id
              key
              averagePrice
              collateral
              entryFundingRate
              realisedPnl
              reserveAmount
              size
              timestamp
            }
            liquidatedPosition {
              id
              key
              account
              collateral
              collateralToken
              indexToken
              isLong
              markPrice
              realisedPnl
              reserveAmount
              size
              timestamp
            }
          }
        }
      `
      })
    })

    const resultJson = await results.json()
    // console.dir({ resultJson }, { depth: 10 });
    // console.log(resultJson.data.trades.length)

    const tradeHistory: TradeHistory[] = []

    for (const each of resultJson.data.trades) {
      const increaseList = each.increaseList
      const decreaseList = each.decreaseList
      const updateList = each.updateList
      const closedPosition = each.closedPosition

      if (!!increaseList) {
        for (const incTrade of increaseList) {
          if (BigNumber.from(incTrade.sizeDelta).eq(0)) continue // Add collateral trades

          let txHash = (incTrade.id as string).split(':')[2]
          let realisedPnl: BigNumber | undefined = undefined

          for (const update of updateList) {
            if ((update.id as string).split(':')[2] == txHash) {
              realisedPnl = BigNumber.from(update.realisedPnl)
              break
            }
          }

          tradeHistory.push({
            marketIdentifier: incTrade.indexToken,
            collateralToken: this.convertToToken(getToken(ARBITRUM, incTrade.collateralToken)),
            direction: incTrade.isLong ? 'LONG' : 'SHORT',
            sizeDelta: BigNumber.from(incTrade.sizeDelta),
            price: BigNumber.from(incTrade.price),
            collateralDelta: BigNumber.from(incTrade.collateralDelta),
            realisedPnl: realisedPnl,
            keeperFeesPaid: BigNumber.from(0),
            positionFee: BigNumber.from(incTrade.fee), // does not include keeper fee
            txHash: txHash,
            timestamp: incTrade.timestamp as number,
            operation: incTrade.isLong ? 'Open Long' : 'Open Short'
          })
        }
      }

      if (!!decreaseList) {
        for (const decTrade of decreaseList) {
          if (BigNumber.from(decTrade.sizeDelta).eq(0)) continue // Remove collateral trades

          let txHash = (decTrade.id as string).split(':')[2]
          let realisedPnl: BigNumber | undefined = undefined
          let collateralDelta = BigNumber.from(decTrade.collateralDelta)

          for (const update of updateList) {
            if ((update.id as string).split(':')[2] == txHash) {
              realisedPnl = BigNumber.from(update.realisedPnl)
              break
            }
          }
          if (!!closedPosition) {
            if ((closedPosition.id as string).split(':')[2] == txHash) {
              realisedPnl = BigNumber.from(closedPosition.realisedPnl)
              collateralDelta = BigNumber.from(each.collateral)
            }
          }

          tradeHistory.push({
            marketIdentifier: decTrade.indexToken,
            collateralToken: this.convertToToken(getToken(ARBITRUM, decTrade.collateralToken)),
            direction: decTrade.isLong ? 'LONG' : 'SHORT',
            sizeDelta: BigNumber.from(decTrade.sizeDelta),
            price: BigNumber.from(decTrade.price),
            collateralDelta: collateralDelta,
            realisedPnl: realisedPnl,
            keeperFeesPaid: BigNumber.from(0), // ether terms
            positionFee: BigNumber.from(decTrade.fee), // does not include keeper fee
            txHash: txHash,
            timestamp: decTrade.timestamp as number,
            operation: decTrade.isLong ? 'Close Long' : 'Close Short'
          })
        }
      }
    }

    tradeHistory.sort((a, b) => {
      return b.timestamp - a.timestamp
    })

    if (tradeHistory.length > 0) {
      let from = new Date(tradeHistory[tradeHistory.length - 1].timestamp * 1000)
      from.setUTCHours(0, 0, 0, 0)
      const fromTS = from.getTime() / 1000

      let to = new Date(tradeHistory[0].timestamp * 1000)
      to.setUTCHours(24, 0, 0, 0)
      const toTS = to.getTime() / 1000

      try {
        type BenchmarkData = {
          t: number[]
          o: number[]
        }

        let pricesData: BenchmarkData

        const ethPriceUrl = `https://benchmarks.pyth.network/v1/shims/tradingview/history?symbol=Crypto.ETH/USD&resolution=D&from=${fromTS}&to=${toTS}`
        pricesData = await fetch(ethPriceUrl).then((d) => d.json())
        let priceMap = new Array<number>()

        for (const i in pricesData.t) {
          priceMap.push(pricesData.o[i])
        }
        // console.log("PriceMapLength: ", priceMap.length, "Price map: ", priceMap);

        for (const each of tradeHistory) {
          const ts = each.timestamp
          const days = Math.floor((ts - fromTS) / 86400)
          const etherPrice = ethers.utils.parseUnits(priceMap[days].toString(), 18)
          const PRECISION = BigNumber.from(10).pow(30)

          each.keeperFeesPaid = this.EXECUTION_FEE.mul(PRECISION)
            .mul(etherPrice)
            .div(ethers.constants.WeiPerEther)
            .div(ethers.constants.WeiPerEther)
        }
      } catch (e) {
        console.log('<Gmx trade history> Error fetching price data: ', e)
      }
    }

    return getPaginatedResponse(tradeHistory, pageOptions)
  }

  async getLiquidationsHistory(
    user: string,
    _: OpenMarkets | undefined,
    pageOptions: PageOptions | undefined
  ): Promise<PaginatedRes<LiquidationHistory>> {
    const results = await fetch('https://api.thegraph.com/subgraphs/name/nissoh/gmx-arbitrum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          liquidatePositions(
            where: {account: "${user.toLowerCase()}"}
          ) {
            collateral
            collateralToken
            id
            indexToken
            isLong
            key
            markPrice
            realisedPnl
            reserveAmount
            size
            timestamp
          }
        }`
      })
    })

    const resultJson = await results.json()

    const liquidationHistory: LiquidationHistory[] = []

    for (const each of resultJson.data.liquidatePositions) {
      liquidationHistory.push({
        marketIdentifier: each.indexToken,
        collateralToken: this.convertToToken(getToken(ARBITRUM, each.collateralToken)),
        liquidationPrice: BigNumber.from(each.markPrice),
        sizeClosed: BigNumber.from(each.size),
        direction: each.isLong ? 'LONG' : 'SHORT',
        realisedPnl: BigNumber.from(each.collateral).mul(-1),
        liquidationFees: BigNumber.from(LIQUIDATION_FEE_USD),
        remainingCollateral: BigNumber.from(0),
        //100x
        liqudationLeverage: {
          value: '100000000',
          decimals: 6
        },
        timestamp: each.timestamp,
        txHash: each.id.split(':')[2]
      })
    }

    liquidationHistory.sort((a, b) => {
      return b.timestamp - a.timestamp
    })

    return getPaginatedResponse(liquidationHistory, pageOptions)
  }

  getIdleMargins(user: string): Promise<(MarketIdentifier & CollateralData)[]> {
    throw new Error('Method not implemented.')
  }

  async checkTradePathLiquidity(
    user: string,
    provider: Provider,
    market: ExtendedMarket,
    order: Order,
    existingPosition: ExtendedPosition | undefined
  ): Promise<ViewError> {
    return await checkTradePathLiquidiytInternal(provider, market, this.getMarketPrice, order)
  }

  async getTradePreview(
    user: string,
    provider: Provider,
    market: ExtendedMarket,
    order: Order,
    existingPosition: ExtendedPosition | undefined,
    opts?: ApiOpts
  ): Promise<ExtendedPosition> {
    return await getTradePreviewInternal(
      user,
      provider,
      market,
      this.convertToToken,
      order,
      this.EXECUTION_FEE,
      existingPosition,
      opts
    )
  }

  async getCloseTradePreview(
    user: string,
    provider: Provider,
    position: ExtendedPosition,
    closeSize: BigNumber,
    isTrigger: boolean,
    triggerPrice: BigNumber | undefined,
    triggerAboveThreshold: boolean | undefined,
    outputToken: Token | undefined,
    opts?: ApiOpts
  ): Promise<ExtendedPosition> {
    return await getCloseTradePreviewInternal(
      provider,
      position,
      closeSize,
      this.EXECUTION_FEE,
      isTrigger,
      triggerPrice,
      outputToken ? this.convertToGToken(outputToken) : undefined,
      this.convertToToken,
      opts
    )
  }

  async getEditCollateralPreview(
    user: string,
    provider: Provider,
    position: ExtendedPosition,
    marginDelta: ethers.BigNumber, // always in token terms
    isDeposit: boolean,
    opts?: ApiOpts
  ): Promise<ExtendedPosition> {
    return await getEditCollateralPreviewInternal(
      provider,
      position,
      marginDelta,
      isDeposit,
      this.convertToToken,
      this.EXECUTION_FEE,
      opts
    )
  }

  getPositionKey(
    account: string,
    collateralTokenAddress: string,
    indexTokenAddress: string,
    isLong: boolean,
    nativeTokenAddress?: string
  ) {
    const tokenAddress0 =
      collateralTokenAddress === ethers.constants.AddressZero ? nativeTokenAddress : collateralTokenAddress
    const tokenAddress1 = indexTokenAddress === ethers.constants.AddressZero ? nativeTokenAddress : indexTokenAddress
    return account + ':' + tokenAddress0 + ':' + tokenAddress1 + ':' + isLong
  }

  getPositionContractKey(account: string, collateralToken: string, indexToken: string, isLong: boolean) {
    return ethers.utils.solidityKeccak256(
      ['address', 'address', 'address', 'bool'],
      [account, collateralToken, indexToken, isLong]
    )
  }

  //////// HELPERS //////////

  getTokenAddress(token: Token): string {
    if (token.address === ethers.constants.AddressZero) {
      return this.nativeTokenAddress
    }
    return token.address
  }

  getTokenAddressString(tokenAddress: string): string {
    if (tokenAddress === ethers.constants.AddressZero) {
      return this.nativeTokenAddress
    }
    return tokenAddress
  }

  getIndexTokenAddressFromPositionKey(positionKey: string): string {
    return positionKey.split(':')[2]
  }

  getCollateralTokenAddressFromPositionKey(positionKey: string): string {
    return positionKey.split(':')[1]
  }

  convertToToken(inToken: { address: string; decimals: number; symbol: string; name: string }): Token {
    let token: Token = {
      address: inToken.address,
      decimals: inToken.decimals.toString(),
      symbol: inToken.symbol,
      name: inToken.name
    }
    return token
  }

  convertToGToken(inToken: Token): GToken {
    let token: GToken = {
      address: inToken.address,
      decimals: Number(inToken.decimals),
      symbol: inToken.symbol,
      name: inToken.name
    }
    return token
  }

  deposit(provider: Provider, market: ExtendedMarket, depositAmount: BigNumber): Promise<UnsignedTxWithMetadata[]> {
    throw new Error('Method not implemented.')
  }
  withdraw(provider: Provider, market: ExtendedMarket, withdrawAmount: BigNumber): Promise<UnsignedTxWithMetadata[]> {
    throw new Error('Method not implemented.')
  }

  ////////// HELPERS ////////////
  // @timer()
  async getAccountOrders(account: string, provider: Provider) {
    const orderBookAddress = getContract(ARBITRUM, 'OrderBook')!
    const orderBookReaderAddress = getContract(ARBITRUM, 'OrderBookReader')!

    const orderBookContract = OrderBook__factory.connect(orderBookAddress, provider)
    const orderBookReaderContract = OrderBookReader__factory.connect(orderBookReaderAddress, provider)

    const fetchIndexesFromServer = () => {
      const ordersIndexesUrl = `${getServerBaseUrl(ARBITRUM)}/orders_indices?account=${account}`
      return fetch(ordersIndexesUrl)
        .then(async (res) => {
          const json = await res.json()
          const ret: {
            [index: string]: Array<{
              _type: string
              val: string
            }>
          } = {}
          for (const key of Object.keys(json)) {
            ret[key.toLowerCase()] = json[key]
              .map((val: { value: string }) => parseInt(val.value))
              .sort((a: number, b: number) => a - b)
          }

          // console.dir(ret, { depth: 10 });
          return ret
        })
        .catch(() => ({ swap: [], increase: [], decrease: [] }))
    }

    const fetchLastIndexes = async () => {
      const [increase, decrease] = await Promise.all([
        (await orderBookContract.increaseOrdersIndex(account)).toNumber(),
        (await orderBookContract.increaseOrdersIndex(account)).toNumber()
      ])

      return { increase, decrease }
    }

    const getRange = (to: number, from?: number) => {
      const LIMIT = 10
      const _indexes: number[] = []
      from = from || Math.max(to - LIMIT, 0)
      for (let i = to - 1; i >= from; i--) {
        _indexes.push(i)
      }
      return _indexes
    }

    const getIndexes = (knownIndexes: number[], lastIndex: number) => {
      if (knownIndexes.length === 0) {
        return getRange(lastIndex)
      }
      return [...knownIndexes, ...getRange(lastIndex, knownIndexes[knownIndexes.length - 1] + 1).sort((a, b) => b - a)]
    }

    const getIncreaseOrders = async (
      knownIndexes: number[],
      lastIndex: number,
      parseFunc: (arg1: [ethers.BigNumber[], string[]], arg2: string, arg3: number[]) => any[]
    ) => {
      const indexes = getIndexes(knownIndexes, lastIndex)
      const ordersData = await orderBookReaderContract.getIncreaseOrders(orderBookAddress, account, indexes)
      const orders = parseFunc(ordersData, account, indexes)

      return orders
    }

    const getDecreaseOrders = async (
      knownIndexes: number[],
      lastIndex: number,
      parseFunc: (arg1: [ethers.BigNumber[], string[]], arg2: string, arg3: number[]) => any[]
    ) => {
      const indexes = getIndexes(knownIndexes, lastIndex)
      const ordersData = await orderBookReaderContract.getDecreaseOrders(orderBookAddress, account, indexes)
      const orders = parseFunc(ordersData, account, indexes)

      return orders
    }

    function _parseOrdersData(
      ordersData: [ethers.BigNumber[], string[]],
      account: string,
      indexes: number[],
      extractor: any,
      uintPropsLength: number,
      addressPropsLength: number
    ) {
      if (!ordersData) {
        return []
      }
      const [uintProps, addressProps] = ordersData
      const count = uintProps.length / uintPropsLength

      const orders: any[] = []
      for (let i = 0; i < count; i++) {
        const sliced = addressProps
          .slice(addressPropsLength * i, addressPropsLength * (i + 1))
          .map((prop) => prop as any)
          .concat(uintProps.slice(uintPropsLength * i, uintPropsLength * (i + 1)))

        if (
          (sliced[0] as string) === ethers.constants.AddressZero &&
          (sliced[1] as string) === ethers.constants.AddressZero
        ) {
          continue
        }

        const order = extractor(sliced)
        order.index = indexes[i]
        order.account = account
        orders.push(order)
      }

      return orders
    }

    function parseDecreaseOrdersData(
      decreaseOrdersData: [ethers.BigNumber[], string[]],
      account: string,
      indexes: number[]
    ) {
      const extractor = (sliced: any[]) => {
        const isLong = sliced[4].toString() === '1'
        return {
          collateralToken: sliced[0] as string,
          indexToken: sliced[1] as string,
          collateralDelta: sliced[2] as BigNumber,
          sizeDelta: sliced[3] as BigNumber,
          isLong,
          triggerPrice: sliced[5] as BigNumber,
          triggerAboveThreshold: sliced[6].toString() === '1',
          type: 'Decrease'
        }
      }
      return _parseOrdersData(decreaseOrdersData, account, indexes, extractor, 5, 2)
    }

    function parseIncreaseOrdersData(
      increaseOrdersData: [ethers.BigNumber[], string[]],
      account: string,
      indexes: number[]
    ) {
      const extractor = (sliced: any[]) => {
        const isLong = sliced[5].toString() === '1'
        return {
          purchaseToken: sliced[0] as string,
          collateralToken: sliced[1] as string,
          indexToken: sliced[2] as string,
          purchaseTokenAmount: sliced[3] as BigNumber,
          sizeDelta: sliced[4] as BigNumber,
          isLong,
          triggerPrice: sliced[6] as BigNumber,
          triggerAboveThreshold: sliced[7].toString() === '1',
          type: 'Increase'
        }
      }
      return _parseOrdersData(increaseOrdersData, account, indexes, extractor, 5, 3)
    }

    const [serverIndexes, lastIndexes]: any = await Promise.all([fetchIndexesFromServer(), fetchLastIndexes()])
    const [increaseOrders = [], decreaseOrders = []] = await Promise.all([
      getIncreaseOrders(serverIndexes.increase, lastIndexes.increase, parseIncreaseOrdersData),
      getDecreaseOrders(serverIndexes.decrease, lastIndexes.decrease, parseDecreaseOrdersData)
    ])
    // increaseOrders.forEach((io: any) => {
    //   logObject("io", io);
    // });
    // decreaseOrders.forEach((dor: any) => {
    //   logObject("do", dor);
    // });

    return [...increaseOrders, ...decreaseOrders]
  }

  async getEthRequired(
    provider: Provider,
    extraEthReq: BigNumber = BigNumber.from(0),
    wallet: string
  ): Promise<BigNumber | undefined> {
    const ethBalance = await provider.getBalance(wallet)
    const ethRequired = this.EXECUTION_FEE.add(extraEthReq || ZERO)

    if (ethBalance.lt(ethRequired)) return ethRequired.sub(ethBalance).add(1)
  }
}
