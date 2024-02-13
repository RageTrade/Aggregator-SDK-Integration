import { BigNumber, UnsignedTransaction, ethers } from 'ethers'
import { getAddress, parseUnits } from 'ethers-v6'
import { CACHE_SECOND, CACHE_TIME_MULT, GMXV1_CACHE_PREFIX, cacheFetch, getStaleTime } from '../../src/common/cache'
import { ZERO } from '../../src/common/constants'
import { FixedNumber } from '../../src/common/fixedNumber'
import {
  applySlippage,
  getBNFromFN,
  getPaginatedResponse,
  isStrEq,
  toAmountInfo,
  validDenomination
} from '../../src/common/helper'
import { decodeMarketId, encodeMarketId } from '../../src/common/markets'
import { rpc } from '../../src/common/provider'
import {
  Token,
  getTokenBySymbol as getTokenBySymbolCommon,
  getTokenByAddress as getTokenByAddressCommon
} from '../../src/common/tokens'
import { ARBITRUM, getConstant } from '../../src/configs/gmx/chains'
import { getContract } from '../../src/configs/gmx/contracts'
import {
  MIN_ORDER_USD,
  V1_TOKENS,
  bigNumberify,
  getCloseTradePreviewInternalV1,
  getEditCollateralPreviewInternalV1,
  getLiquidationPrice,
  getPositionQuery,
  getPositions,
  getServerBaseUrl,
  getServerUrl,
  getToken,
  getTokenBySymbol,
  getTradePreviewInternalV1,
  getWhitelistedTokens,
  useInfoTokens
} from '../../src/configs/gmx/tokens'
import { IAdapterV1, ProtocolInfo } from '../../src/interfaces/V1/IAdapterV1'
import {
  AgentParams,
  AgentState,
  AmountInfo,
  ApiOpts,
  AvailableToTradeParams,
  CancelOrder,
  ClaimInfo,
  ClosePositionData,
  CloseTradePreviewInfo,
  CollateralData,
  CreateOrder,
  DepositWithdrawParams,
  DynamicMarketMetadata,
  GenericStaticMarketMetadata,
  HistoricalTradeInfo,
  IdleMarginInfo,
  LiquidationInfo,
  Market,
  MarketInfo,
  MarketState,
  OpenTradePreviewInfo,
  OrderData,
  OrderIdentifier,
  OrderInfo,
  OrderType,
  PageOptions,
  PaginatedRes,
  PnlData,
  PositionInfo,
  PreviewInfo,
  Protocol,
  ProtocolId,
  UpdateOrder,
  UpdatePositionMarginData
} from '../../src/interfaces/V1/IRouterAdapterBaseV1'
import {
  IERC20__factory,
  OrderBookReader__factory,
  OrderBook__factory,
  PositionRouter__factory,
  Reader__factory,
  ReferralStorage__factory,
  Router__factory
} from '../../typechain/gmx-v1'
import { Chain } from 'viem'
import { arbitrum, optimism } from 'viem/chains'
import { getUsd } from '../configs/gmx/tokens'
import { Provider } from '../interface'
import { CACHE_HOUR, CACHE_MINUTE, GMX_COMMON_CACHE_PREFIX, getCachedValueByKey } from '../common/cache'
import {
  EMPTY_DESC,
  GMXV1_ENABLE_ORDERBOOK_H,
  GMXV1_ENABLE_POSITION_ROUTER_H,
  GMX_SET_REFERRAL_CODE_H,
  getIncreasePositionHeading,
  UPDATE_ORDER_H,
  CANCEL_ORDER_H,
  getClosePositionHeading,
  UPDATE_DEPOSIT_H,
  UPDATE_WITHDRAW_H,
  getApproveTokenHeading
} from '../common/buttonHeadings'
import { AccountInfo, OrderBook } from '../interfaces/V1/IRouterAdapterBaseV1'
import { ActionParam } from '../interfaces/IActionExecutor'

const GMX_V1_PROTOCOL_ID = 'GMXV1'

// taken from contract Vault.sol
const LIQUIDATION_FEE_USD = BigNumber.from('5000000000000000000000000000000')
type Plugin = 'ORDERBOOK' | 'POSITION_ROUTER' | 'BOTH'

export default class GmxV1Adapter implements IAdapterV1 {
  protocolId: ProtocolId = 'GMXV1'

  private provider = rpc[42161]

  private REFERRAL_CODE = '0x7261676574726164650000000000000000000000000000000000000000000000'
  private minCollateralUsd = parseUnits('10', 30)
  private MARKET_EXEC_FEE = getConstant(ARBITRUM, 'EXECUTION_FEE_MARKET_ACTION_V1')! as BigNumber
  private LIMIT_EXEC_FEE = getConstant(ARBITRUM, 'EXECUTION_FEE_LIMIT_ACTION_v1')! as BigNumber
  private nativeTokenAddress = getContract(ARBITRUM, 'NATIVE_TOKEN')!
  private shortTokenAddress = getTokenBySymbol(ARBITRUM, 'USDC.e')!.address
  private isOBPluginApprovedMap: Record<string, boolean> = {}
  private isPRPluginApprovedMap: Record<string, boolean> = {}
  private tokenSpentApprovedMap: Record<string, boolean> = {}

  async init(wallet: string | undefined, opts?: ApiOpts | undefined): Promise<void> {
    await this._preWarmCache(wallet)
    return Promise.resolve()
  }

  async setup(): Promise<ActionParam[]> {
    return Promise.resolve([])
  }

  async deposit(params: DepositWithdrawParams[]): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }

  async withdraw(params: DepositWithdrawParams[]): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }

  getProtocolInfo(): ProtocolInfo {
    const info: ProtocolInfo = {
      hasAgent: false,
      hasAccount: false,
      hasOrderbook: false,
      sizeDeltaInToken: false,
      explicitFundingClaim: false,
      collateralDeltaInToken: true,
      collateralUsesLimitPricing: false
    }

    return info
  }

  async getAvailableToTrade(wallet: string, params: AvailableToTradeParams<this['protocolId']>) {
    return {
      isTokenAmount: true,
      amount: FixedNumber.fromString('0')
    }
  }

  async getReferralAndPluginApprovals(wallet: string, plugin: Plugin, opts?: ApiOpts): Promise<ActionParam[]> {
    let txs: ActionParam[] = []

    // check and set referral code
    const referralCodeTxsPromise = this.checkAndSetReferralCodeTx(wallet, opts)

    // check and set plugin approvals
    const pluginApprovalTxsPromise = this.checkAndGetPluginApprovalTxs(wallet, plugin)

    const [referralCodeTxs, pluginApprovalTxs] = await Promise.all([referralCodeTxsPromise, pluginApprovalTxsPromise])

    txs.push(...referralCodeTxs)
    txs.push(...pluginApprovalTxs)

    return txs
  }

  async _getOBApprovalTx(): Promise<ActionParam> {
    const router = Router__factory.connect(getContract(ARBITRUM, 'Router')!, this.provider)
    const orderBook = getContract(ARBITRUM, 'OrderBook')!

    const approveOrderBookTx = await router.populateTransaction.approvePlugin(orderBook)
    return {
      tx: approveOrderBookTx,
      isUserAction: true,
      // type: 'GMX_V1',
      // data: undefined,
      chainId: ARBITRUM,
      heading: GMXV1_ENABLE_ORDERBOOK_H,
      desc: EMPTY_DESC
    }
  }

  async _getPRApprovalTx(): Promise<ActionParam> {
    const router = Router__factory.connect(getContract(ARBITRUM, 'Router')!, this.provider)
    const positionRouter = getContract(ARBITRUM, 'PositionRouter')!

    const approvePositionRouterTx = await router.populateTransaction.approvePlugin(positionRouter)
    return {
      tx: approvePositionRouterTx,
      isUserAction: true,
      // type: 'GMX_V1',
      // data: undefined,
      chainId: ARBITRUM,
      heading: GMXV1_ENABLE_POSITION_ROUTER_H,
      desc: EMPTY_DESC
    }
  }

  async checkAndGetPluginApprovalTxs(wallet: string, plugin: Plugin): Promise<ActionParam[]> {
    let txs: ActionParam[] = []

    // check whether plugins are approved or not
    const router = Router__factory.connect(getContract(ARBITRUM, 'Router')!, this.provider)
    const orderBook = getContract(ARBITRUM, 'OrderBook')!
    const positionRouter = getContract(ARBITRUM, 'PositionRouter')!

    const obApprovalPromise = router.approvedPlugins(wallet, orderBook)
    const prApprovalPromise = router.approvedPlugins(wallet, positionRouter)

    if (plugin == 'ORDERBOOK') {
      if (this.isOBPluginApprovedMap[wallet]) {
        return txs
      }

      const obApproval = await obApprovalPromise
      if (!obApproval) {
        txs.push(await this._getOBApprovalTx())
      } else {
        this.isOBPluginApprovedMap[wallet] = true
      }
    } else if (plugin == 'POSITION_ROUTER') {
      if (this.isPRPluginApprovedMap[wallet]) {
        return txs
      }

      const prApproval = await prApprovalPromise
      if (!prApproval) {
        txs.push(await this._getPRApprovalTx())
      } else {
        this.isPRPluginApprovedMap[wallet] = true
      }
    } else if (plugin == 'BOTH') {
      const [obApproval, prApproval] = await Promise.all([obApprovalPromise, prApprovalPromise])

      if (!obApproval) {
        txs.push(await this._getOBApprovalTx())
      } else {
        this.isOBPluginApprovedMap[wallet] = true
      }

      if (!prApproval) {
        txs.push(await this._getPRApprovalTx())
      } else {
        this.isPRPluginApprovedMap[wallet] = true
      }
    }

    return txs
  }

  async checkAndSetReferralCodeTx(wallet: string, opts?: ApiOpts): Promise<ActionParam[]> {
    let txs: ActionParam[] = []
    const referralStorage = ReferralStorage__factory.connect(getContract(ARBITRUM, 'ReferralStorage')!, this.provider)

    // Fetch user referral code
    const trcKey = [GMX_COMMON_CACHE_PREFIX, 'traderReferralCodes', wallet]
    const cachedCode = getCachedValueByKey(trcKey) as string | undefined
    // if cached code exists and equal to our referral code, set stale time to 5 minutes otherwise always fetch
    const sTimeTRC =
      cachedCode && cachedCode.toLowerCase() == this.REFERRAL_CODE.toLowerCase()
        ? getStaleTime(CACHE_MINUTE * 5, opts)
        : getStaleTime(CACHE_SECOND * 3, opts)

    const code = await cacheFetch({
      key: trcKey,
      fn: () => referralStorage.traderReferralCodes(wallet),
      staleTime: sTimeTRC,
      cacheTime: sTimeTRC * CACHE_TIME_MULT,
      opts
    })

    if (code.toLowerCase() != this.REFERRAL_CODE.toLowerCase()) {
      // set referral code
      const setReferralCodeTx = await referralStorage.populateTransaction.setTraderReferralCodeByUser(
        this.REFERRAL_CODE
      )
      txs.push({
        tx: setReferralCodeTx,
        isUserAction: true,
        // type: 'GMX_V1',
        // data: undefined,
        chainId: ARBITRUM,
        heading: GMX_SET_REFERRAL_CODE_H,
        desc: EMPTY_DESC
      })
    }

    return txs
  }

  supportedChains(): Chain[] {
    return [arbitrum]
  }

  async supportedMarkets(chains: Chain[] | undefined, opts?: ApiOpts | undefined): Promise<MarketInfo[]> {
    const marketsInfo: MarketInfo[] = []

    if (chains == undefined || chains.includes(arbitrum)) {
      this._getIndexTokens().forEach((it) => {
        const market: Market = {
          marketId: encodeMarketId(arbitrum.id.toString(), GMX_V1_PROTOCOL_ID, this.getTokenAddress(it)),
          chain: arbitrum,
          indexToken: it,
          longCollateral: this._getCollateralTokens(),
          shortCollateral: this._getCollateralTokens(),
          supportedModes: {
            ISOLATED: true,
            CROSS: false
          },
          supportedOrderTypes: {
            LIMIT: true,
            MARKET: true,
            STOP_LOSS: true,
            TAKE_PROFIT: true,
            STOP_LOSS_LIMIT: false,
            TAKE_PROFIT_LIMIT: false
          },
          supportedOrderActions: {
            CREATE: true,
            UPDATE: true,
            CANCEL: true
          },
          marketSymbol: this._getMarketSymbol(it)
        }

        const staticMetadata: GenericStaticMarketMetadata = {
          maxLeverage: FixedNumber.fromValue('500000', 4, 4),
          minLeverage: FixedNumber.fromValue('11000', 4, 4),
          minInitialMargin: FixedNumber.fromValue(this.minCollateralUsd.toString(), 30, 30),
          minPositionSize: FixedNumber.fromValue(MIN_ORDER_USD.toString(), 30, 30),
          maxPrecision: 1,
          amountStep: undefined,
          priceStep: undefined
        }

        const protocol: Protocol = {
          protocolId: GMX_V1_PROTOCOL_ID
        }

        const marketInfo: MarketInfo = {
          ...market,
          ...staticMetadata,
          ...protocol
        }

        marketsInfo.push(marketInfo)
      })
    }

    return Promise.resolve(marketsInfo)
  }

  async getMarketsInfo(marketIds: string[], opts?: ApiOpts | undefined): Promise<MarketInfo[]> {
    const result: MarketInfo[] = []
    const markets = await this.supportedMarkets(this.supportedChains(), opts)

    marketIds.forEach((marketId) => {
      const market = markets.find((m) => m.marketId == marketId)!
      result.push(market)
    })

    return result
  }

  async getMarketPrices(marketIds: string[], opts?: ApiOpts | undefined): Promise<FixedNumber[]> {
    // 2 second cache for (almost) frequent queries
    const sTimeP = getStaleTime(CACHE_SECOND * 2, opts)
    const priceRes = await cacheFetch({
      key: [GMXV1_CACHE_PREFIX, '_getOraclePrices'],
      fn: () => this._getOraclePrices(),
      staleTime: sTimeP,
      cacheTime: sTimeP * CACHE_TIME_MULT,
      opts
    })

    return marketIds.map((marketId) => {
      const indexTokenAddress = decodeMarketId(marketId).protocolMarketId
      const price = priceRes[indexTokenAddress]
      return FixedNumber.fromValue(price.toString(), 30, 30)
    })
  }

  async getDynamicMarketMetadata(marketIds: string[], opts?: ApiOpts | undefined): Promise<DynamicMarketMetadata[]> {
    const metadata: DynamicMarketMetadata[] = []

    const reader = Reader__factory.connect(getContract(ARBITRUM, 'Reader')!, this.provider)

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

    const { infoTokens } = await useInfoTokens(this.provider, ARBITRUM, false, [BigNumber.from(0)], fundingRateInfo)
    const markets = await this.getMarketsInfo(marketIds, opts)

    // short token is same across all markets
    const shortTokenInfo = infoTokens[getTokenBySymbol(ARBITRUM, 'USDC.e')!.address]

    for (const market of markets) {
      const longTokenInfo = infoTokens[market.indexToken.address[arbitrum.id]!]

      const dynamicMetadata: DynamicMarketMetadata = {
        oiLong: FixedNumber.fromValue(longTokenInfo.guaranteedUsd!.toString(), 30, 30),
        oiShort: FixedNumber.fromValue(longTokenInfo.globalShortSize!.toString(), 30, 30),
        availableLiquidityLong: FixedNumber.fromValue(longTokenInfo.maxAvailableLong!.toString(), 30, 30),
        availableLiquidityShort: FixedNumber.fromValue(shortTokenInfo.maxAvailableShort!.toString(), 30, 30),
        longFundingRate: FixedNumber.fromValue(ZERO.toString(), 6, 30),
        shortFundingRate: FixedNumber.fromValue(ZERO.toString(), 6, 30),
        longBorrowRate: FixedNumber.fromValue(longTokenInfo.fundingRate!.mul(-1).toString(), 6, 30),
        shortBorrowRate: FixedNumber.fromValue(shortTokenInfo.fundingRate!.mul(-1).toString(), 6, 30)
      }

      metadata.push(dynamicMetadata)
    }

    return metadata
  }

  async increasePosition(orderData: CreateOrder[], wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    let txs: ActionParam[] = []

    // check which plugins are required
    let isObReq = false
    let isPrReq = false
    for (const o of orderData) {
      if (o.type == 'LIMIT') {
        isObReq = true
      } else if (o.type == 'MARKET') {
        isPrReq = true
      }
    }
    const plugin: Plugin = isObReq && isPrReq ? 'BOTH' : isObReq ? 'ORDERBOOK' : 'POSITION_ROUTER'

    // check for referral and plugin approvals
    let refAndPluginTxsPromise = this.getReferralAndPluginApprovals(wallet, plugin, opts)

    const provider = this.provider

    // get required approval amounts for all positions at once
    let approveMap: Record<string, BigNumber> = {}
    for (const order of orderData) {
      if (!validDenomination(order.marginDelta, true)) throw new Error('Margin Delta must be in token denomination')
      if (!validDenomination(order.sizeDelta, false)) throw new Error('Size Delta must be in USD denomination')

      const inputCollateralAddress = order.collateral.address[ARBITRUM]!
      const marginDeltaBN = getBNFromFN(order.marginDelta.amount)

      if (inputCollateralAddress != ethers.constants.AddressZero) {
        if (approveMap[inputCollateralAddress] === undefined) {
          approveMap[inputCollateralAddress] = marginDeltaBN
        } else {
          approveMap[inputCollateralAddress] = approveMap[inputCollateralAddress].add(marginDeltaBN)
        }
      }
    }

    // approval txs
    const tokenAddresses = Object.keys(approveMap)
    const approvalAmounts = Object.values(approveMap)
    let approvalTxsPromise = this.getApproveRouterSpendTxs(tokenAddresses, approvalAmounts, wallet, opts)

    const [refAndPluginTxs, approvalTxs] = await Promise.all([refAndPluginTxsPromise, approvalTxsPromise])
    txs.push(...refAndPluginTxs)
    txs.push(...approvalTxs)

    for (const order of orderData) {
      const inputCollateralAddress = order.collateral.address[ARBITRUM]!
      const marginDeltaBN = getBNFromFN(order.marginDelta.amount)
      const sizeDeltaBN = getBNFromFN(order.sizeDelta.amount.toFormat(30))
      const triggerPriceBN = getBNFromFN(order.triggerData!.triggerPrice)

      const tokenAddressString = this.getTokenAddressString(inputCollateralAddress)
      const market = (await this.getMarketsInfo([order.marketId]))[0]
      const marketIndexTokenAddress = this.getTokenAddressString(market.indexToken.address[ARBITRUM]!)

      let createOrderTx: UnsignedTransaction
      let extraEthReq = BigNumber.from(0)
      if (order.type == 'LIMIT') {
        const orderBook = OrderBook__factory.connect(getContract(ARBITRUM, 'OrderBook')!, provider)

        const path: string[] = []
        path.push(tokenAddressString)

        const isEthCollateral = inputCollateralAddress == ethers.constants.AddressZero

        if (isEthCollateral) {
          extraEthReq = marginDeltaBN
        }

        createOrderTx = await orderBook.populateTransaction.createIncreaseOrder(
          path,
          marginDeltaBN,
          marketIndexTokenAddress,
          0,
          sizeDeltaBN,
          order.direction == 'LONG' ? marketIndexTokenAddress : this.shortTokenAddress,
          order.direction == 'LONG' ? true : false,
          triggerPriceBN,
          !(order.direction == 'LONG'),
          this.LIMIT_EXEC_FEE,
          isEthCollateral,
          {
            value: isEthCollateral ? this.LIMIT_EXEC_FEE.add(marginDeltaBN) : this.LIMIT_EXEC_FEE
          }
        )
      } else if (order.type == 'MARKET') {
        const positionRouter = PositionRouter__factory.connect(getContract(ARBITRUM, 'PositionRouter')!, provider)

        const path: string[] = []
        path.push(tokenAddressString)
        if (order.direction == 'LONG') {
          if (tokenAddressString.toLowerCase() != marketIndexTokenAddress.toLowerCase()) {
            path.push(marketIndexTokenAddress)
          }
        } else {
          if (tokenAddressString != this.shortTokenAddress) {
            path.push(this.shortTokenAddress)
          }
        }

        const acceptablePrice =
          order.slippage && order.slippage > 0
            ? applySlippage(triggerPriceBN, order.slippage, order.direction == 'LONG')
            : triggerPriceBN

        if (inputCollateralAddress != ethers.constants.AddressZero) {
          createOrderTx = await positionRouter.populateTransaction.createIncreasePosition(
            path,
            marketIndexTokenAddress,
            marginDeltaBN,
            0,
            sizeDeltaBN,
            order.direction == 'LONG' ? true : false,
            acceptablePrice,
            this.MARKET_EXEC_FEE,
            ethers.constants.HashZero, // Referral code set separately
            ethers.constants.AddressZero,
            {
              value: this.MARKET_EXEC_FEE
            }
          )
        } else {
          extraEthReq = marginDeltaBN

          createOrderTx = await positionRouter.populateTransaction.createIncreasePositionETH(
            path,
            marketIndexTokenAddress,
            0,
            sizeDeltaBN,
            order.direction == 'LONG' ? true : false,
            acceptablePrice,
            this.MARKET_EXEC_FEE,
            ethers.constants.HashZero, // Referral code set seprately
            ethers.constants.AddressZero,
            {
              value: this.MARKET_EXEC_FEE.add(marginDeltaBN)
            }
          )
        }
      }

      txs.push({
        tx: createOrderTx!,
        isUserAction: true,
        // type: 'GMX_V1',
        // data: undefined,
        ethRequired: await this.getEthRequired(
          wallet,
          extraEthReq,
          order.type == 'MARKET' ? this.MARKET_EXEC_FEE : this.LIMIT_EXEC_FEE
        ),
        chainId: ARBITRUM,
        heading: getIncreasePositionHeading('GMXV1', order.direction, market.marketSymbol),
        desc: EMPTY_DESC
      })
    }

    return txs
  }

  async updateOrder(orderData: UpdateOrder[], wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    let txs: ActionParam[] = []

    // check for referral and plugin approvals
    txs.push(...(await this.getReferralAndPluginApprovals(wallet, 'ORDERBOOK', opts)))

    const orderBook = OrderBook__factory.connect(getContract(ARBITRUM, 'OrderBook')!, this.provider)

    let updateOrderTx

    for (const updatedOrder of orderData) {
      if (!validDenomination(updatedOrder.marginDelta, true))
        throw new Error('Margin Delta must be in token denomination')
      if (!validDenomination(updatedOrder.sizeDelta, false)) throw new Error('Size Delta must be in USD denomination')

      let marginDeltaBN = getBNFromFN(updatedOrder.marginDelta.amount)
      let sizeDeltaBN = getBNFromFN(updatedOrder.sizeDelta.amount.toFormat(30))
      let triggerPriceBN = getBNFromFN(updatedOrder.triggerData!.triggerPrice)

      if (updatedOrder.orderType! == 'LIMIT') {
        updateOrderTx = await orderBook.populateTransaction.updateIncreaseOrder(
          BigNumber.from(updatedOrder.orderId),
          sizeDeltaBN,
          triggerPriceBN,
          updatedOrder.triggerData!.triggerAboveThreshold!
        )
      } else if (updatedOrder.orderType! == 'STOP_LOSS' || updatedOrder.orderType! == 'TAKE_PROFIT') {
        updateOrderTx = await orderBook.populateTransaction.updateDecreaseOrder(
          BigNumber.from(updatedOrder.orderId),
          marginDeltaBN,
          sizeDeltaBN,
          triggerPriceBN,
          updatedOrder.triggerData!.triggerAboveThreshold!
        )
      } else {
        throw new Error('Invalid order type')
      }

      txs.push({
        tx: updateOrderTx!,
        isUserAction: true,
        // type: 'GMX_V1',
        // data: undefined,
        chainId: ARBITRUM,
        heading: UPDATE_ORDER_H,
        desc: EMPTY_DESC
      })
    }

    return txs
  }

  async cancelOrder(orderData: CancelOrder[], wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    let txs: ActionParam[] = []
    // check for referral and plugin approvals
    txs.push(...(await this.getReferralAndPluginApprovals(wallet, 'ORDERBOOK', opts)))

    const orderBook = OrderBook__factory.connect(getContract(ARBITRUM, 'OrderBook')!, this.provider)

    let cancelOrderTx

    for (const order of orderData) {
      if (order.type! == 'LIMIT') {
        cancelOrderTx = await orderBook.populateTransaction.cancelIncreaseOrder(BigNumber.from(order.orderId))
      } else if (order.type! == 'STOP_LOSS' || order.type! == 'TAKE_PROFIT') {
        cancelOrderTx = await orderBook.populateTransaction.cancelDecreaseOrder(BigNumber.from(order.orderId))
      } else {
        throw new Error('Invalid order type')
      }

      txs.push({
        tx: cancelOrderTx!,
        isUserAction: true,
        // type: 'GMX_V1',
        // data: undefined,
        chainId: ARBITRUM,
        heading: CANCEL_ORDER_H,
        desc: EMPTY_DESC
      })
    }

    return txs
  }

  async authenticateAgent(agentParams: AgentParams[], wallet: string, opts?: ApiOpts): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }

  async closePosition(
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[],
    wallet: string,
    opts?: ApiOpts | undefined
  ): Promise<ActionParam[]> {
    let txs: ActionParam[] = []

    // check which plugins are required
    let isObReq = false
    let isPrReq = false
    for (const cpd of closePositionData) {
      if (cpd.type != 'MARKET') {
        isObReq = true
      } else {
        isPrReq = true
      }
    }
    const plugin: Plugin = isObReq && isPrReq ? 'BOTH' : isObReq ? 'ORDERBOOK' : 'POSITION_ROUTER'
    // check for referral and plugin approvals
    txs.push(...(await this.getReferralAndPluginApprovals(wallet, plugin, opts)))

    // const positionOrdersPromise = this.getAllOrdersForPosition(wallet, positionInfo, undefined, opts)
    const marketPricesPromise = this.getMarketPrices(
      positionInfo.map((pi) => pi.marketId),
      opts
    )
    const marketsInfoPromise = this.getMarketsInfo(
      positionInfo.map((pi) => pi.marketId),
      opts
    )
    const [/* positionOrders, */ marketPrices, marketsInfo] = await Promise.all([
      // positionOrdersPromise,
      marketPricesPromise,
      marketsInfoPromise
    ])

    for (let i = 0; i < positionInfo.length; i++) {
      const pi = positionInfo[i]
      const cpd = closePositionData[i]
      const position = pi.metadata
      const market = marketsInfo[i]

      if (!validDenomination(cpd.closeSize, false)) throw new Error('Close size must be in USD denomination')

      const closeSizeBN = getBNFromFN(cpd.closeSize.amount)
      const isTrigger = cpd.type != 'MARKET'
      const indexAddress = this.getIndexTokenAddressFromPositionKey(pi.posId)

      if (!isTrigger) {
        // let remainingSize = position.size.sub(closeSizeBN)

        // if (positionOrders[pi.posId]) {
        //   // close all related tp/sl orders if order.sizeDelta > remaining size
        //   const orders = positionOrders[pi.posId].result.filter(
        //     (order) =>
        //       (order.orderType == 'TAKE_PROFIT' || order.orderType == 'STOP_LOSS') &&
        //       getBNFromFN(order.sizeDelta.amount.toFormat(30)).gt(remainingSize)
        //   )
        //   const cancelOrderTxs = await this.cancelOrder(
        //     orders.map((o) => {
        //       return {
        //         marketId: o.marketId,
        //         orderId: o.orderId,
        //         type: o.orderType
        //       }
        //     }),
        //     wallet,
        //     opts
        //   )
        //   txs.push(...cancelOrderTxs)
        // }

        // close position
        let collateralOutAddr = cpd.outputCollateral
          ? cpd.outputCollateral.address[ARBITRUM]!
          : position.originalCollateralToken

        const marketPrice = getBNFromFN(marketPrices[i])
        const fillPrice = pi.direction == 'LONG' ? marketPrice.mul(99).div(100) : marketPrice.mul(101).div(100)

        const positionRouter = PositionRouter__factory.connect(getContract(ARBITRUM, 'PositionRouter')!, this.provider)

        const path: string[] = []
        path.push(position.originalCollateralToken)
        if (
          this.getTokenAddressString(collateralOutAddr!).toLowerCase() != position.originalCollateralToken.toLowerCase()
        ) {
          path.push(this.getTokenAddressString(collateralOutAddr!))
        }

        let createOrderTx = await positionRouter.populateTransaction.createDecreasePosition(
          path,
          indexAddress,
          BigNumber.from(0),
          closeSizeBN,
          pi.direction! == 'LONG' ? true : false,
          wallet,
          fillPrice,
          0,
          this.MARKET_EXEC_FEE,
          collateralOutAddr == ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          {
            value: this.MARKET_EXEC_FEE
          }
        )
        txs.push({
          tx: createOrderTx,
          isUserAction: true,
          // type: 'GMX_V1',
          // data: undefined,
          ethRequired: await this.getEthRequired(wallet, undefined, this.MARKET_EXEC_FEE),
          chainId: ARBITRUM,
          heading: getClosePositionHeading('GMXV1', market.marketSymbol, 'MARKET'),
          desc: EMPTY_DESC
        })
      } else {
        const orderBook = OrderBook__factory.connect(getContract(ARBITRUM, 'OrderBook')!, this.provider)

        let createOrderTx = await orderBook.populateTransaction.createDecreaseOrder(
          indexAddress,
          closeSizeBN,
          position.originalCollateralToken,
          BigNumber.from(0), // in USD e30
          pi.direction == 'LONG' ? true : false,
          getBNFromFN(cpd.triggerData!.triggerPrice),
          cpd.triggerData!.triggerAboveThreshold,
          {
            value: this.LIMIT_EXEC_FEE
          }
        )

        let isTp = false
        if (position.direction! == 'LONG') {
          isTp = cpd.triggerData!.triggerAboveThreshold
        } else {
          isTp = !cpd.triggerData!.triggerAboveThreshold
        }

        txs.push({
          tx: createOrderTx,
          isUserAction: true,
          // type: 'GMX_V1',
          // data: undefined,
          ethRequired: await this.getEthRequired(wallet, undefined, this.LIMIT_EXEC_FEE),
          chainId: ARBITRUM,
          heading: getClosePositionHeading('GMXV1', market.marketSymbol, isTp ? 'TAKE_PROFIT' : 'STOP_LOSS'),
          desc: EMPTY_DESC
        })
      }
    }

    return txs
  }

  async updatePositionMargin(
    positionInfo: PositionInfo[],
    updatePositionMarginData: UpdatePositionMarginData[],
    wallet: string,
    opts?: ApiOpts | undefined
  ): Promise<ActionParam[]> {
    let txs: ActionParam[] = []
    // check for referral and plugin approvals
    txs.push(...(await this.getReferralAndPluginApprovals(wallet, 'POSITION_ROUTER', opts)))

    const marketPrices = await this.getMarketPrices(
      positionInfo.map((pi) => pi.marketId),
      opts
    )
    const positionRouter = PositionRouter__factory.connect(getContract(ARBITRUM, 'PositionRouter')!, this.provider)

    for (let i = 0; i < positionInfo.length; i++) {
      const pi = positionInfo[i]
      const upmd = updatePositionMarginData[i]
      const position = pi.metadata
      const transferToken = upmd.collateral
      const isDeposit = upmd.isDeposit

      if (!validDenomination(upmd.margin, true)) throw new Error('Margin must be in token denomination')

      const marginAmount = getBNFromFN(upmd.margin.amount)

      const indexAddress = this.getIndexTokenAddressFromPositionKey(pi.posId)
      const marketPrice = getBNFromFN(marketPrices[i])
      const transferTokenAddress = transferToken.address[ARBITRUM]!
      const transferTokenString = this.getTokenAddressString(transferTokenAddress)

      const path: string[] = []

      let marginTx: UnsignedTransaction
      let extraEthReq = BigNumber.from(0)

      if (isDeposit) {
        //approve router for token spends
        if (!isStrEq(transferTokenAddress, ethers.constants.AddressZero)) {
          let approvalTx = await this.getApproveRouterSpendTx(transferTokenAddress, marginAmount, wallet)
          if (approvalTx) txs.push(approvalTx)
        }

        const fillPrice = pi.direction == 'LONG' ? marketPrice.mul(101).div(100) : marketPrice.mul(99).div(100)

        if (!isStrEq(transferTokenString, pi.collateral.address[ARBITRUM]!)) {
          path.push(transferTokenString, pi.collateral.address[ARBITRUM]!)
        } else {
          path.push(pi.collateral.address[ARBITRUM]!)
        }

        if (isStrEq(transferTokenAddress, ethers.constants.AddressZero)) {
          extraEthReq = marginAmount

          marginTx = await positionRouter.populateTransaction.createIncreasePositionETH(
            path,
            indexAddress,
            0,
            BigNumber.from(0),
            pi.direction == 'LONG' ? true : false,
            fillPrice,
            this.MARKET_EXEC_FEE,
            ethers.constants.HashZero, // Referral code set during setup()
            ethers.constants.AddressZero,
            {
              value: this.MARKET_EXEC_FEE.add(marginAmount)
            }
          )
        } else {
          marginTx = await positionRouter.populateTransaction.createIncreasePosition(
            path,
            indexAddress,
            marginAmount,
            0,
            BigNumber.from(0),
            pi.direction == 'LONG' ? true : false,
            fillPrice,
            this.MARKET_EXEC_FEE,
            ethers.constants.HashZero, // Referral code set during setup()
            ethers.constants.AddressZero,
            {
              value: this.MARKET_EXEC_FEE
            }
          )
        }
      } else {
        path.push(pi.collateral.address[ARBITRUM]!)
        if (!isStrEq(transferTokenString, pi.collateral.address[ARBITRUM]!)) {
          path.push(transferTokenString)
        }

        const fillPrice = pi.direction == 'LONG' ? marketPrice.mul(99).div(100) : marketPrice.mul(101).div(100)
        const { infoTokens } = await useInfoTokens(this.provider, ARBITRUM, false)
        const marginAmountUSD = getUsd(marginAmount, transferTokenString, false, infoTokens)!

        marginTx = await positionRouter.populateTransaction.createDecreasePosition(
          path,
          indexAddress,
          marginAmountUSD,
          BigNumber.from(0),
          pi.direction == 'LONG' ? true : false,
          wallet,
          fillPrice,
          0,
          this.MARKET_EXEC_FEE,
          transferTokenAddress == ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          {
            value: this.MARKET_EXEC_FEE
          }
        )
      }

      txs.push({
        tx: marginTx,
        isUserAction: true,
        // type: 'GMX_V1',
        // data: undefined,
        ethRequired: await this.getEthRequired(wallet, extraEthReq, this.MARKET_EXEC_FEE),
        chainId: ARBITRUM,
        heading: isDeposit ? UPDATE_DEPOSIT_H : UPDATE_WITHDRAW_H,
        desc: EMPTY_DESC
      })
    }

    return txs
  }

  claimFunding(wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }

  getIdleMargins(wallet: string, opts?: ApiOpts | undefined): Promise<IdleMarginInfo[]> {
    throw new Error('Method not implemented.')
  }

  async getAllPositions(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<PositionInfo>> {
    const reader = Reader__factory.connect(getContract(ARBITRUM, 'Reader')!, this.provider)

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
      wallet,
      positionQuery.collateralTokens,
      positionQuery.indexTokens,
      positionQuery.isLong
    )

    let sTimeFR = getStaleTime(CACHE_SECOND * 30, opts)
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

    const { infoTokens } = await useInfoTokens(
      this.provider,
      ARBITRUM,
      false,
      undefined,
      fundingRateInfo,
      undefined,
      opts
    )

    // console.log(infoTokens)

    const { positions, positionsMap } = getPositions(
      ARBITRUM,
      positionQuery,
      positionData,
      infoTokens,
      false,
      true,
      getAddress(wallet),
      undefined,
      undefined
    )

    let positionsInfo: PositionInfo[] = []

    for (const pos of positions) {
      const accessibleMargin: BigNumber = pos.collateralAfterFee.sub(MIN_ORDER_USD).gt(0)
        ? pos.collateralAfterFee.sub(MIN_ORDER_USD)
        : bigNumberify(0)
      const liqPrice = getLiquidationPrice({
        size: pos.size,
        collateral: pos.collateral,
        averagePrice: pos.averagePrice,
        isLong: pos.isLong,
        fundingFee: pos.fundingFee
      })

      const collateralToken = getTokenByAddressCommon(this.getCollateralTokenAddressFromPositionKey(pos.key))
      const indexToken = getTokenByAddressCommon(this.getIndexTokenAddressFromPositionKey(pos.key))

      const rawPnl = pos.hasProfit ? pos.delta : pos.delta.mul(-1)
      const aggregatePnl = rawPnl.sub(pos.fundingFee)
      const uPnl: PnlData = {
        aggregatePnl: FixedNumber.fromValue(aggregatePnl.toString(), 30, 30),
        rawPnl: FixedNumber.fromValue(rawPnl.toString(), 30, 30),
        borrowFee: FixedNumber.fromValue(pos.fundingFee.toString(), 30, 30),
        fundingFee: FixedNumber.fromValue(ZERO.toString(), 30, 30)
      }

      const pi: PositionInfo = {
        marketId: encodeMarketId(
          arbitrum.id.toString(),
          GMX_V1_PROTOCOL_ID,
          this.getIndexTokenAddressFromPositionKey(pos.key)
        ),
        posId: pos.key,
        size: toAmountInfo(pos.size, 30, false),
        margin: toAmountInfo(pos.collateral, 30, false),
        accessibleMargin: toAmountInfo(accessibleMargin.gt('0') ? accessibleMargin : ZERO, 30, false),
        avgEntryPrice: FixedNumber.fromValue(pos.averagePrice.toString(), 30, 30),
        cumulativeFunding: FixedNumber.fromValue(pos.fundingFee.toString(), 30, 30),
        unrealizedPnl: uPnl,
        liquidationPrice: liqPrice ? FixedNumber.fromValue(liqPrice.toString(), 30, 30) : FixedNumber.fromValue('0'),
        leverage: FixedNumber.fromValue(pos.leverage!.toString(), 4, 4),
        direction: pos.isLong ? 'LONG' : 'SHORT',
        collateral: collateralToken,
        indexToken: indexToken,
        protocolId: GMX_V1_PROTOCOL_ID,
        roe: FixedNumber.fromString(aggregatePnl.div(pos.collateral).toString()),
        metadata: pos,
        mode: 'ISOLATED'
      }

      positionsInfo.push(pi)
    }

    return getPaginatedResponse(positionsInfo, pageOptions)
  }

  async getAllOrders(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<OrderInfo>> {
    const ordersInfo: OrderInfo[] = []

    const orders = await this._getAccountOrders(wallet, this.provider)
    orders.forEach((order) => {
      let isIncrease = order.type == 'Increase'
      let collateralToken: Token
      let collateralAmount: BigNumber
      if (isIncrease) {
        collateralToken = getTokenByAddressCommon(order.purchaseToken)
        collateralAmount = order.purchaseTokenAmount as BigNumber
      } else {
        collateralToken = getTokenByAddressCommon(order.collateralToken)
        collateralAmount = order.collateralDelta as BigNumber
      }

      let isTp = false
      let triggerType
      if (!isIncrease) {
        if (order.isLong) {
          isTp = order.triggerAboveThreshold as boolean
        } else {
          isTp = !order.triggerAboveThreshold as boolean
        }
        triggerType = isTp ? 'TAKE_PROFIT' : 'STOP_LOSS'
      } else {
        triggerType = 'NONE'
      }

      const oData: OrderData = {
        mode: 'ISOLATED',
        marketId: encodeMarketId(arbitrum.id.toString(), GMX_V1_PROTOCOL_ID, order.indexToken),
        direction: order.isLong ? 'LONG' : 'SHORT',
        sizeDelta: toAmountInfo(order.sizeDelta, 30, false),
        marginDelta: toAmountInfo(collateralAmount, collateralToken.decimals, true),
        triggerData: {
          triggerPrice: FixedNumber.fromValue(order.triggerPrice.toString(), 30, 30),
          triggerAboveThreshold: order.triggerAboveThreshold as boolean,
          triggerLimitPrice: undefined
        }
      }
      const oId: OrderIdentifier = {
        orderId: String(order.index),
        marketId: encodeMarketId(arbitrum.id.toString(), GMX_V1_PROTOCOL_ID, order.indexToken)
      }
      const oType = {
        orderType: this._getOrderType(order.type, triggerType)
      }
      const oCollateralData: CollateralData = {
        collateral: collateralToken
      }
      const oProtocolId = {
        protocolId: GMX_V1_PROTOCOL_ID as ProtocolId
      }
      const orderInfo: OrderInfo = {
        ...oData,
        ...oId,
        ...oType,
        ...oCollateralData,
        ...oProtocolId,
        tif: 'GTC'
      }

      ordersInfo.push(orderInfo)
    })

    return getPaginatedResponse(ordersInfo, pageOptions)
  }

  async getAllOrdersForPosition(
    wallet: string,
    positionInfo: PositionInfo[],
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<Record<string, PaginatedRes<OrderInfo>>> {
    const allOrders = (await this.getAllOrders(wallet, undefined, opts)).result
    const ordersForPositionInternal: Record<string, OrderInfo[]> = {}

    for (const o of allOrders) {
      for (const p of positionInfo) {
        if (this._isOrderForPosition(o, p)) {
          if (ordersForPositionInternal[p.posId] === undefined) {
            ordersForPositionInternal[p.posId] = []
          }
          ordersForPositionInternal[p.posId].push(o)
        }
      }
    }

    const ordersForPosition: Record<string, PaginatedRes<OrderInfo>> = {}
    for (const posId of Object.keys(ordersForPositionInternal)) {
      ordersForPosition[posId] = getPaginatedResponse(ordersForPositionInternal[posId], pageOptions)
    }

    return ordersForPosition
  }

  async getTradesHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<HistoricalTradeInfo>> {
    const results = await fetch('https://api.thegraph.com/subgraphs/name/nissoh/gmx-arbitrum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          trades(first: 1000, where: {account: "${wallet.toLowerCase()}"}, orderBy: timestamp, orderDirection: desc ) {
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

    const tradesInfo: HistoricalTradeInfo[] = []

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

          tradesInfo.push({
            marketId: encodeMarketId(arbitrum.id.toString(), GMX_V1_PROTOCOL_ID, incTrade.indexToken),
            timestamp: incTrade.timestamp as number,
            indexPrice: FixedNumber.fromValue(BigNumber.from(incTrade.price).toString(), 30, 30),
            direction: incTrade.isLong ? 'LONG' : 'SHORT',
            sizeDelta: toAmountInfo(BigNumber.from(incTrade.sizeDelta), 30, false),
            marginDelta: toAmountInfo(BigNumber.from(incTrade.collateralDelta), 30, false),
            collateralPrice: incTrade.isLong
              ? FixedNumber.fromValue(BigNumber.from(incTrade.price).toString(), 30, 30)
              : FixedNumber.fromValue(parseUnits('1', 30).toString(), 30, 30), // usdc price would be updated from pyth price below
            collateral: getTokenByAddressCommon(incTrade.collateralToken),
            realizedPnl: FixedNumber.fromValue(realisedPnl!.toString(), 30, 30),
            keeperFeesPaid: FixedNumber.fromValue('0', 30, 30),
            positionFee: FixedNumber.fromValue(BigNumber.from(incTrade.fee).toString(), 30, 30),
            operationType: incTrade.isLong ? 'Open Long' : 'Open Short',
            txHash: txHash
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

          tradesInfo.push({
            marketId: encodeMarketId(arbitrum.id.toString(), GMX_V1_PROTOCOL_ID, decTrade.indexToken),
            timestamp: decTrade.timestamp as number,
            indexPrice: FixedNumber.fromValue(BigNumber.from(decTrade.price).toString(), 30, 30),
            direction: decTrade.isLong ? 'LONG' : 'SHORT',
            sizeDelta: toAmountInfo(BigNumber.from(decTrade.sizeDelta), 30, false),
            marginDelta: toAmountInfo(BigNumber.from(collateralDelta), 30, false),
            collateralPrice: decTrade.isLong
              ? FixedNumber.fromValue(BigNumber.from(decTrade.price).toString(), 30, 30)
              : FixedNumber.fromValue(parseUnits('1', 30).toString(), 30, 30), // usdc price would be updated from pyth price below
            collateral: getTokenByAddressCommon(decTrade.collateralToken),
            realizedPnl: FixedNumber.fromValue(realisedPnl!.toString(), 30, 30),
            keeperFeesPaid: FixedNumber.fromValue('0', 30, 30),
            positionFee: FixedNumber.fromValue(BigNumber.from(decTrade.fee).toString(), 30, 30),
            operationType: decTrade.isLong ? 'Close Long' : 'Close Short',
            txHash: txHash
          })
        }
      }
    }

    tradesInfo.sort((a, b) => {
      return b.timestamp - a.timestamp
    })

    if (tradesInfo.length > 0) {
      let from = new Date(tradesInfo[tradesInfo.length - 1].timestamp * 1000)
      from.setUTCHours(0, 0, 0, 0)
      const fromTS = from.getTime() / 1000

      let to = new Date(tradesInfo[0].timestamp * 1000)
      to.setUTCHours(24, 0, 0, 0)
      const toTS = to.getTime() / 1000

      try {
        type BenchmarkData = {
          t: number[]
          o: number[]
        }

        let ethPricesData: BenchmarkData
        let usdcPricesData: BenchmarkData

        const ethPriceUrl = `https://benchmarks.pyth.network/v1/shims/tradingview/history?symbol=Crypto.ETH/USD&resolution=D&from=${fromTS}&to=${toTS}`
        const usdcPriceUrl = `https://benchmarks.pyth.network/v1/shims/tradingview/history?symbol=Crypto.USDC/USD&resolution=D&from=${fromTS}&to=${toTS}`
        const ethPricesDataPromise = fetch(ethPriceUrl).then((d) => d.json())
        const usdcPricesDataPromise = fetch(usdcPriceUrl).then((d) => d.json())
        ;[ethPricesData, usdcPricesData] = await Promise.all([ethPricesDataPromise, usdcPricesDataPromise])

        let ethPriceMap = new Array<number>()
        let usdcPriceMap = new Array<number>()

        for (const i in ethPricesData.t) {
          ethPriceMap.push(ethPricesData.o[i])
        }
        for (const i in usdcPricesData.t) {
          usdcPriceMap.push(usdcPricesData.o[i])
        }
        // console.log("PriceMapLength: ", priceMap.length, "Price map: ", priceMap);

        for (const each of tradesInfo) {
          const ts = each.timestamp
          const days = Math.floor((ts - fromTS) / 86400)
          const etherPrice = ethers.utils.parseUnits(ethPriceMap[days].toString(), 18)
          const usdcPrice = ethers.utils.parseUnits(usdcPriceMap[days].toString(), 30)
          const PRECISION = BigNumber.from(10).pow(30)

          each.keeperFeesPaid = FixedNumber.fromValue(
            this.LIMIT_EXEC_FEE.mul(PRECISION)
              .mul(etherPrice)
              .div(ethers.constants.WeiPerEther)
              .div(ethers.constants.WeiPerEther)
              .toString(),
            30,
            30
          )

          if (each.direction == 'SHORT') {
            each.collateralPrice = FixedNumber.fromValue(usdcPrice.toString(), 30, 30)
          }
        }
      } catch (e) {
        console.log('<Gmx trade history> Error fetching price data: ', e)
      }
    }

    return getPaginatedResponse(tradesInfo, pageOptions)
  }

  async getLiquidationHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<LiquidationInfo>> {
    const results = await fetch('https://api.thegraph.com/subgraphs/name/nissoh/gmx-arbitrum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          liquidatePositions(
            where: {account: "${wallet.toLowerCase()}"}
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

    // console.dir({ results }, { depth: 4 })

    const resultJson = await results.json()

    const liquidationHistory: LiquidationInfo[] = []

    for (const each of resultJson.data.liquidatePositions) {
      liquidationHistory.push({
        marketId: encodeMarketId(arbitrum.id.toString(), GMX_V1_PROTOCOL_ID, each.indexToken),
        timestamp: each.timestamp as number,
        liquidationPrice: FixedNumber.fromValue(each.markPrice, 30, 30),
        direction: each.isLong ? 'LONG' : 'SHORT',
        sizeClosed: toAmountInfo(each.size, 30, false),
        remainingCollateral: toAmountInfo(ZERO, 30, false),
        collateral: getTokenByAddressCommon(each.collateralToken),
        realizedPnl: FixedNumber.fromValue(BigNumber.from(each.collateral).mul(-1).toString(), 30, 30),
        liquidationFees: FixedNumber.fromValue(BigNumber.from(LIQUIDATION_FEE_USD).toString(), 30, 30), // USD
        liqudationLeverage: FixedNumber.fromValue('1000000', 4, 4), //100x
        txHash: each.id.split(':')[2]
      })
    }

    liquidationHistory.sort((a, b) => {
      return b.timestamp - a.timestamp
    })

    return getPaginatedResponse(liquidationHistory, pageOptions)
  }

  getClaimHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<ClaimInfo>> {
    return Promise.resolve({ result: [], maxItemsCount: 0 })
  }

  async getOpenTradePreview(
    wallet: string,
    orderData: CreateOrder[],
    existingPos: (PositionInfo | undefined)[],
    opts?: ApiOpts | undefined
  ): Promise<OpenTradePreviewInfo[]> {
    const previews: OpenTradePreviewInfo[] = []

    const markets = await this.getMarketsInfo(
      orderData.map((o) => o.marketId),
      opts
    )

    for (let i = 0; i < orderData.length; i++) {
      if (!validDenomination(orderData[i].marginDelta, true)) throw new Error('Margin delta must be token denominated')
      if (!validDenomination(orderData[i].sizeDelta, false)) throw new Error('Size delta must be usd denominated')

      // size should be in 30 decimals
      orderData[i].sizeDelta.amount = orderData[i].sizeDelta.amount.toFormat(30)

      previews.push(
        await getTradePreviewInternalV1(
          orderData[i],
          existingPos[i],
          markets[i],
          this.MARKET_EXEC_FEE,
          this.LIMIT_EXEC_FEE,
          opts
        )
      )
    }

    return previews
  }

  async getCloseTradePreview(
    wallet: string,
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[],
    opts?: ApiOpts | undefined
  ): Promise<CloseTradePreviewInfo[]> {
    const previews: CloseTradePreviewInfo[] = []

    for (let i = 0; i < positionInfo.length; i++) {
      if (!validDenomination(closePositionData[i].closeSize, false))
        throw new Error('Close size must be USD denominated')

      // size should be in 30 decimals
      closePositionData[i].closeSize.amount = closePositionData[i].closeSize.amount.toFormat(30)

      previews.push(
        await getCloseTradePreviewInternalV1(
          positionInfo[i],
          closePositionData[i],
          this.MARKET_EXEC_FEE,
          this.LIMIT_EXEC_FEE,
          opts
        )
      )
    }

    return previews
  }

  async getUpdateMarginPreview(
    wallet: string,
    isDeposit: boolean[],
    marginDelta: AmountInfo[],
    existingPos: PositionInfo[],
    opts?: ApiOpts | undefined
  ): Promise<PreviewInfo[]> {
    const previews: PreviewInfo[] = []

    for (let i = 0; i < existingPos.length; i++) {
      if (!validDenomination(marginDelta[i], true)) throw new Error('Margin delta must be token denominated')

      previews.push(
        await getEditCollateralPreviewInternalV1(
          wallet,
          isDeposit[i],
          marginDelta[i],
          existingPos[i],
          this.MARKET_EXEC_FEE,
          opts
        )
      )
    }

    return previews
  }

  getTotalClaimableFunding(wallet: string, opts?: ApiOpts | undefined): Promise<FixedNumber> {
    return Promise.resolve(FixedNumber.fromValue('0', 30, 30))
  }
  getTotalAccuredFunding(wallet: string, opts?: ApiOpts | undefined): Promise<FixedNumber> {
    return Promise.resolve(FixedNumber.fromValue('0', 30, 30))
  }
  async getAccountInfo(wallet: string, opts?: ApiOpts): Promise<AccountInfo[]> {
    return Promise.resolve([])
  }

  ////////// GMX specific helper methods //////////

  private async _getAccountOrders(account: string, provider: ethers.providers.Provider) {
    const orderBookAddress = getContract(ARBITRUM, 'OrderBook')!
    const orderBookReaderAddress = getContract(ARBITRUM, 'OrderBookReader')!

    const orderBookContract = OrderBook__factory.connect(orderBookAddress, provider)
    const orderBookReaderContract = OrderBookReader__factory.connect(orderBookReaderAddress, provider)

    const fetchIndexesFromServer = async () => {
      const ordersIndexesUrl = `${getServerBaseUrl(ARBITRUM)}/orders_indices?account=${account}`
      try {
        const res = await fetch(ordersIndexesUrl)
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
        return ret
      } catch {
        return { swap: [], increase: [], decrease: [] }
      }
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

  private _getOrderType(type: string, triggerType: string): OrderType {
    if (triggerType === 'STOP_LOSS' || triggerType === 'TAKE_PROFIT') {
      return triggerType as OrderType
    } else {
      return 'LIMIT'
    }
  }

  private _isOrderForPosition(order: OrderInfo, position: PositionInfo): boolean {
    return order.marketId === position.marketId && order.direction === position.direction
  }

  private _getIndexTokens(): Token[] {
    return getWhitelistedTokens(ARBITRUM)
      .filter((token) => !token.isStable && !token.isWrapped)
      .map((t) => {
        return {
          symbol: t.symbol,
          name: t.name,
          decimals: t.decimals,
          address: {
            [arbitrum.id]: t.address,
            [optimism.id]: undefined
          }
        } as Token
      })
  }

  private _getCollateralTokens(): Token[] {
    return getWhitelistedTokens(ARBITRUM)
      .filter((token) => !token.isTempHidden)
      .map((t) => {
        return {
          symbol: t.symbol,
          name: t.name,
          decimals: t.decimals,
          address: {
            [arbitrum.id]: t.address,
            [optimism.id]: undefined
          }
        } as Token
      })
  }

  private _getMarketSymbol(token: Token): string {
    return token.symbol === 'WETH' ? 'ETH' : token.symbol
  }

  private async _getOraclePrices(): Promise<{ [key: string]: string }> {
    const indexPricesUrl = getServerUrl(ARBITRUM, '/prices')
    const pricesRes = await fetch(indexPricesUrl)
    const resJson = (await pricesRes.json()) as { [key: string]: string }

    return resJson
  }

  private getIndexTokenAddressFromPositionKey(positionKey: string): string {
    return positionKey.split(':')[2]
  }

  private getCollateralTokenAddressFromPositionKey(positionKey: string): string {
    return positionKey.split(':')[1]
  }

  // private async getApproveRouterSpendTx(
  //   tokenAddress: string,
  //   allowanceAmount: BigNumber
  // ): Promise<UnsignedTxWithMetadata | undefined> {
  //   let token = IERC20__factory.connect(tokenAddress, rpc[ARBITRUM])
  //   const router = getContract(ARBITRUM, 'Router')!

  //   let allowance = await token.allowance(this.swAddr!, router)

  //   if (allowance.lt(allowanceAmount)) {
  //     let tx = await token.populateTransaction.approve(router, ethers.constants.MaxUint256)
  //     return {
  //       tx,
  //       type: 'ERC20_APPROVAL',
  //       data: { chainId: ARBITRUM, spender: router, token: tokenAddress },
  //       chainId: ARBITRUM
  //     }
  //   }
  // }

  private async getApproveRouterSpendTxs(
    tokenAddresses: string[],
    allowanceAmounts: BigNumber[],
    wallet: string,
    opts?: ApiOpts
  ): Promise<ActionParam[]> {
    let txs: ActionParam[] = []

    const router = getContract(ARBITRUM, 'Router')!

    let allowancePromises = []
    for (let i = 0; i < tokenAddresses.length; i++) {
      const tokenAddress = tokenAddresses[i]
      const key = `${wallet}-${tokenAddress}-${router}`

      if (this.tokenSpentApprovedMap[key]) {
        allowancePromises.push(Promise.resolve(ethers.constants.MaxUint256))
      } else {
        let token = IERC20__factory.connect(tokenAddress, rpc[ARBITRUM])

        const allowancePromise = token.allowance(wallet, router)

        allowancePromises.push(allowancePromise)
      }
    }
    const allowances = await Promise.all(allowancePromises)

    for (let i = 0; i < tokenAddresses.length; i++) {
      const allowance = allowances[i]
      const tokenAddress = tokenAddresses[i]
      const key = `${wallet}-${tokenAddress}-${router}`

      // if allowance is 80% of Max then set cache
      if (allowance.gt(ethers.constants.MaxUint256.mul(8).div(10))) {
        this.tokenSpentApprovedMap[key] = true
      }
    }

    for (let i = 0; i < tokenAddresses.length; i++) {
      let tokenAddress = tokenAddresses[i]
      let allowanceAmount = allowanceAmounts[i]
      let allowance = allowances[i]
      let token = IERC20__factory.connect(tokenAddress, rpc[ARBITRUM])

      if (allowance.lt(allowanceAmount)) {
        let tx = await token.populateTransaction.approve(router, ethers.constants.MaxUint256)
        txs.push({
          tx,
          isUserAction: true,
          // type: 'ERC20_APPROVAL',
          // data: { chainId: ARBITRUM, spender: router, token: tokenAddress },
          chainId: ARBITRUM,
          heading: getApproveTokenHeading(getToken(ARBITRUM, tokenAddress).symbol),
          desc: EMPTY_DESC
        })
      }
    }

    return txs
  }

  getTokenAddress(token: Token): string {
    if (token.address[ARBITRUM]! === ethers.constants.AddressZero) {
      return this.nativeTokenAddress
    }
    return token.address[ARBITRUM]!
  }

  getTokenAddressString(tokenAddress: string): string {
    if (tokenAddress === ethers.constants.AddressZero) {
      return this.nativeTokenAddress
    }
    return tokenAddress
  }

  async getEthRequired(
    wallet: string,
    extraEthReq: BigNumber = BigNumber.from(0),
    executionFee: BigNumber
  ): Promise<BigNumber | undefined> {
    const sTimeEthBal = getStaleTime(CACHE_SECOND * 30)
    const ethBalance = await cacheFetch({
      key: [GMX_COMMON_CACHE_PREFIX, 'ethBalance', wallet],
      fn: () => this.provider.getBalance(wallet),
      staleTime: sTimeEthBal,
      cacheTime: sTimeEthBal * CACHE_TIME_MULT
    })
    const ethRequired = executionFee.add(extraEthReq || ZERO)

    if (ethBalance.lt(ethRequired)) return ethRequired.sub(ethBalance).add(1)
  }

  async getApproveRouterSpendTx(
    tokenAddress: string,
    allowanceAmount: BigNumber,
    wallet: string
  ): Promise<ActionParam | undefined> {
    let token = IERC20__factory.connect(tokenAddress, this.provider)
    const router = getContract(ARBITRUM, 'Router')!
    const key = `${wallet}-${tokenAddress}-${router}`

    if (this.tokenSpentApprovedMap[key]) return

    let allowance = await token.allowance(wallet, router)
    // if allowance is 80% of Max then set cache
    if (allowance.gt(ethers.constants.MaxUint256.mul(8).div(10))) {
      this.tokenSpentApprovedMap[key] = true
    }

    if (allowance.lt(allowanceAmount)) {
      let tx = await token.populateTransaction.approve(router, ethers.constants.MaxUint256)
      return {
        tx,
        isUserAction: true,
        // type: 'ERC20_APPROVAL',
        // data: { chainId: ARBITRUM, spender: router, token: tokenAddress },
        chainId: ARBITRUM,
        heading: getApproveTokenHeading(getToken(ARBITRUM, tokenAddress).symbol),
        desc: EMPTY_DESC
      }
    }
  }

  async _preWarmCache(wallet: string | undefined) {
    const provider = rpc[ARBITRUM]

    // funding Rates
    const reader = Reader__factory.connect(getContract(ARBITRUM, 'Reader')!, provider)
    const nativeTokenAddress = getContract(ARBITRUM, 'NATIVE_TOKEN')
    const whitelistedTokens = V1_TOKENS[ARBITRUM]
    const tokenAddresses = whitelistedTokens.map((x) => x.address)
    await cacheFetch({
      key: [
        GMXV1_CACHE_PREFIX,
        'getFundingRates',
        nativeTokenAddress!,
        tokenAddresses.join('-'),
        getContract(ARBITRUM, 'Vault')!
      ],
      fn: () => reader.getFundingRates(getContract(ARBITRUM, 'Vault')!, nativeTokenAddress!, tokenAddresses),
      staleTime: 0,
      cacheTime: 0
    })

    if (wallet) {
      // trader referral code
      const referralStorage = ReferralStorage__factory.connect(getContract(ARBITRUM, 'ReferralStorage')!, provider)
      await cacheFetch({
        key: [GMX_COMMON_CACHE_PREFIX, 'traderReferralCodes', wallet],
        fn: () => referralStorage.traderReferralCodes(wallet),
        staleTime: 0,
        cacheTime: 0
      })

      // plugin approvals
      await this.checkAndGetPluginApprovalTxs(wallet, 'BOTH')

      // eth balance
      await cacheFetch({
        key: [GMX_COMMON_CACHE_PREFIX, 'ethBalance', wallet],
        fn: () => provider.getBalance(wallet),
        staleTime: 0,
        cacheTime: 0
      })

      // token approvals
      for (const tokenAddress of tokenAddresses) {
        if (tokenAddress == ethers.constants.AddressZero) continue

        let token = IERC20__factory.connect(tokenAddress, provider)
        const router = getContract(ARBITRUM, 'Router')!
        const key = `${wallet}-${tokenAddress}-${router}`

        let allowance = await token.allowance(wallet, router)

        // if allowance is 80% of Max then set cache
        if (allowance.gt(ethers.constants.MaxUint256.mul(8).div(10))) {
          this.tokenSpentApprovedMap[key] = true
        }
      }
    }
  }

  getMarketState(wallet: string, marketIds: string[], opts?: ApiOpts | undefined): Promise<MarketState[]> {
    return Promise.resolve([])
  }

  getAgentState(wallet: string, agentParams?: AgentParams[], opts?: ApiOpts): Promise<AgentState[]> {
    throw new Error('Method not implemented.')
  }

  getOrderBooks(
    marketIds: string[],
    sigFigs: (number | undefined)[],
    opts?: ApiOpts | undefined
  ): Promise<OrderBook[]> {
    throw new Error('Method not implemented.')
  }
}
