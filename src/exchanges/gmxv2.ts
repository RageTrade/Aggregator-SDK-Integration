import { IAdapterV1 } from '../interfaces/V1/IAdapterV1'
import {
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
  GenericStaticMarketMetadata,
  OrderData,
  OrderIdentifier,
  TradeDirection,
  TradeOperationType,
} from '../interfaces/V1/IRouterAdapterBaseV1'
import { rpc } from '../common/provider'
import {
  DataStore__factory,
  Reader,
  Reader__factory,
  ExchangeRouter__factory,
  IERC20__factory,
  Keys
} from '../../typechain/gmx-v2'
import { BigNumber, ethers } from 'ethers'
import { OrderType } from '../interfaces/V1/IRouterAdapterBaseV1'
import { OrderDirection } from '../interface'
import { Token, tokens } from '../common/tokens'
import { applySlippage, getPaginatedResponse, logObject, toAmountInfo, getBNFromFN } from '../common/helper'
import { Chain, arbitrum } from 'viem/chains'
import { GMX_V2_TOKEN, GMX_V2_TOKENS, getGmxV2TokenByAddress } from '../configs/gmxv2/gmxv2Tokens'
import { formatUnits, parseUnits } from 'ethers/lib/utils'
import { hashedPositionKey, openInterestKey } from '../configs/gmxv2/config/dataStore'
import { ContractMarketPrices } from '../configs/gmxv2/markets/types'
import { useMarketsInfo } from '../configs/gmxv2/markets/useMarketsInfo'
import { usePositionsInfo } from '../configs/gmxv2/positions/usePositionsInfo'
import { ARBITRUM } from '../configs/gmx/chains'
import { chains } from 'perennial-sdk-ts'
import { useOrdersInfo } from '../configs/gmxv2/orders/useOrdersInfo'
import { TradeFeesType, TriggerThresholdType } from '../configs/gmxv2/trade/types'
import { PositionOrderInfo, isMarketOrderType, isOrderForPosition } from '../configs/gmxv2/orders'
import { OrderType as InternalOrderType, OrdersInfoData } from '../configs/gmxv2/orders/types'
import { PositionInfo as InternalPositionInfo } from '../configs/gmxv2/positions/types'
import { encodeMarketId } from '../common/markets'
import { FixedNumber } from '../common/fixedNumber'
import { getAvailableUsdLiquidityForPosition } from '../configs/gmxv2/markets/utils'
import {
  getBorrowingFactorPerPeriod,
  getFundingFactorPerPeriod,
  getFundingFeeRateUsd
} from '../configs/gmxv2/fees/utils'
import { BASIS_POINTS_DIVISOR } from '../configs/gmx/tokens'
import { convertToUsd, convertToTokenAmount, getIsEquivalentTokens } from '../configs/gmxv2/tokens/utils'
import {
  getIncreasePositionAmounts,
  getNextPositionValuesForIncreaseTrade
} from '../configs/gmxv2/trade/utils/increase'
import { usePositionsConstants } from '../configs/gmxv2/positions/usePositionsConstants'
import { estimateExecuteIncreaseOrderGasLimit, getExecutionFee } from '../configs/gmxv2/fees/utils'
import { getTradeFees } from '../configs/gmxv2/trade/utils/common'
import { TokenData } from '../configs/gmxv2/tokens/types'
import { ZERO } from '../common/constants'

export const DEFAULT_ACCEPTABLE_PRICE_SLIPPAGE = 1
export const DEFAULT_EXEUCTION_FEE = ethers.utils.parseEther('0.00131')

export const REFERRAL_CODE = '0x7261676574726164650000000000000000000000000000000000000000000000'

enum SolidityOrderType {
  MarketSwap,
  LimitSwap,
  MarketIncrease,
  LimitIncrease,
  MarketDecrease,
  LimitDecrease,
  StopLossDecrease,
  Liquidation
}

enum DecreasePositionSwapType {
  NoSwap,
  SwapPnlTokenToCollateralToken,
  SwapCollateralTokenToPnlToken
}

const mapping: Record<string, Record<string, number>> = {
  LONG: {
    LIMIT: SolidityOrderType.LimitIncrease,
    MARKET: SolidityOrderType.MarketIncrease,
    STOP_LOSS: SolidityOrderType.StopLossDecrease,
    TAKE_PROFIT: SolidityOrderType.LimitDecrease
  },
  SHORT: {
    LIMIT: SolidityOrderType.LimitIncrease,
    MARKET: SolidityOrderType.MarketIncrease,
    STOP_LOSS: SolidityOrderType.StopLossDecrease,
    TAKE_PROFIT: SolidityOrderType.LimitDecrease
  }
}

export default class GmxV2Service implements IAdapterV1 {
  private READER_ADDR = '0xf60becbba223EEA9495Da3f606753867eC10d139'
  private DATASTORE_ADDR = '0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8'
  private EXCHANGE_ROUTER = '0x7C68C7866A64FA2160F78EEaE12217FFbf871fa8'

  private ROUTER_ADDR = '0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6'
  private ORDER_VAULT_ADDR = '0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5'

  private SUBGRAPH_URL = 'https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-arbitrum-stats/api'

  private provider = rpc[42161]

  private reader = Reader__factory.connect(this.READER_ADDR, this.provider)
  private datastore = DataStore__factory.connect(this.DATASTORE_ADDR, this.provider)
  private exchangeRouter = ExchangeRouter__factory.connect(this.EXCHANGE_ROUTER, this.provider)

  private minCollateralUsd = parseUnits('10', 30)
  private cachedMarkets: Record<
    string,
    {
      marketInfo: MarketInfo
      market: Awaited<ReturnType<Reader['getMarket']>>
    }
  > = {}

  private _smartWallet: string | undefined

  async setup(swAddr: string): Promise<UnsignedTxWithMetadata[]> {
    this._smartWallet = ethers.utils.getAddress(swAddr)
    await this._buildCacheIfEmpty()
    return Promise.resolve([])
  }

  supportedChains(): Chain[] {
    return [chains[42161]]
  }

  async supportedMarkets(networks: Chain[] | undefined): Promise<MarketInfo[]> {
    // get from cache if available
    if (Object.keys(this.cachedMarkets).length > 0) return Object.values(this.cachedMarkets).map((m) => m.marketInfo)

    const marketProps = await this.reader.getMarkets(this.DATASTORE_ADDR, 0, 1000)

    const marketsInfo: MarketInfo[] = []
    for (const mProp of marketProps) {
      if (mProp.indexToken === ethers.constants.AddressZero) continue

      const longToken = getGmxV2TokenByAddress(mProp.longToken)
      const shortToken = getGmxV2TokenByAddress(mProp.shortToken)

      const market: Market = {
        marketId: encodeMarketId(arbitrum.id.toString(), 'GMXV2', mProp.marketToken),
        chain: chains[42161],
        indexToken: getGmxV2TokenByAddress(mProp.indexToken),
        longCollateral: [longToken, shortToken],
        shortCollateral: [longToken, shortToken],
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
        },
        marketSymbol: this._getMarketSymbol(getGmxV2TokenByAddress(mProp.indexToken))
      }

      const staticMetadata: GenericStaticMarketMetadata = {
        maxLeverage: FixedNumber.fromValue('500000', 4, 4),
        minLeverage: FixedNumber.fromValue('11000', 4, 4),
        minInitialMargin: FixedNumber.fromValue(this.minCollateralUsd.toString(), 30, 30),
        minPositionSize: FixedNumber.fromValue(parseUnits('11', 30).toString(), 30, 30)
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

      this.cachedMarkets[marketInfo.marketId] = {
        marketInfo,
        market: mProp
      }
    }

    return marketsInfo
  }

  async getMarketPrices(marketIds: string[]): Promise<FixedNumber[]> {
    const marketsInfo = await this.getMarketsInfo(marketIds)
    const prices: FixedNumber[] = []
    const priceRes = await this._getOraclePrices()

    for (const mInfo of marketsInfo) {
      const tokenPrice = this._getMinMaxPrice(mInfo.indexToken.address[42161]!, priceRes)

      // get mid price for calculations and display on f/e
      const price = BigNumber.from(tokenPrice.minPrice).add(BigNumber.from(tokenPrice.maxPrice)).div(2)

      prices.push(FixedNumber.fromValue(price.toString(), tokenPrice.priceDecimals, 30))
    }

    return prices
  }

  async getMarketsInfo(marketIds: string[]): Promise<MarketInfo[]> {
    // Build cache if not available already
    await this._buildCacheIfEmpty()

    const marketsInfo: MarketInfo[] = []

    for (const mId of marketIds) {
      const marketInfo = this.cachedMarkets[mId]
      if (marketInfo === undefined) throw new Error(`Market ${mId} not found`)

      marketsInfo.push(marketInfo.marketInfo)
    }

    return marketsInfo
  }

  async getDynamicMarketMetadata(marketIds: string[]): Promise<DynamicMarketMetadata[]> {
    const metadata: DynamicMarketMetadata[] = []
    const { marketsInfoData } = await useMarketsInfo(ARBITRUM, this._smartWallet!)

    if (!marketsInfoData) throw new Error('markets info not loaded')

    for (const mId of marketIds) {
      const info = marketsInfoData[mId.split(':')[0]]

      // OI
      const longOI = info.longInterestUsd
      const shortOI = info.shortInterestUsd

      // available liquidity
      const availLiqLong = getAvailableUsdLiquidityForPosition(info, true)
      const availLiqShort = getAvailableUsdLiquidityForPosition(info, false)

      // funding
      const borrowingRateLong = getBorrowingFactorPerPeriod(info, true, 3_600)
      const borrowingRateShort = getBorrowingFactorPerPeriod(info, false, 3_600)

      const fundingRateLong = getFundingFactorPerPeriod(info, true, 3_600)
      const fundingRateShort = getFundingFactorPerPeriod(info, false, 3_600)

      const longRate = borrowingRateLong.add(fundingRateLong)
      const shortRate = borrowingRateShort.add(fundingRateShort)

      metadata.push({
        oiLong: FixedNumber.fromString(formatUnits(longOI, 30), 'fixed128x30'),
        oiShort: FixedNumber.fromString(formatUnits(shortOI, 30), 'fixed128x30'),
        availableLiquidityLong: FixedNumber.fromString(formatUnits(availLiqLong, 30), 'fixed128x30'),
        availableLiquidityShort: FixedNumber.fromString(formatUnits(availLiqShort, 30), 'fixed128x30'),
        longRate: FixedNumber.fromString(formatUnits(longRate, 30), 'fixed128x30'),
        shortRate: FixedNumber.fromString(formatUnits(shortRate, 30), 'fixed128x30')
      })
    }

    return metadata
  }

  async _approveIfNeeded(token: string, amount: bigint): Promise<UnsignedTxWithMetadata | undefined> {
    if (token == ethers.constants.AddressZero) return

    const tokenContract = IERC20__factory.connect(token, this.provider)

    const allowance = await tokenContract.allowance(this._smartWallet!, this.ROUTER_ADDR)

    if (allowance.gt(amount)) return

    const tx = await tokenContract.populateTransaction.approve(this.ROUTER_ADDR, amount)

    return {
      tx: tx,
      type: 'ERC20_APPROVAL',
      data: {
        token: token,
        spender: this.ROUTER_ADDR,
        chainId: 42161
      }
    }
  }

  _mapOrderType(orderType: OrderType, orderDirection: OrderDirection) {
    return mapping[orderDirection][orderType]
  }

  ///// Action api's //////

  async increasePosition(orderData: CreateOrder[]): Promise<UnsignedTxWithMetadata[]> {
    if (!this._smartWallet) throw new Error('smart wallet not set in adapter')

    const txs: UnsignedTxWithMetadata[] = []

    // checks for min collateral, min leverage should be done in preview or f/e

    for (const od of orderData) {
      // get market details
      const mkt = this.cachedMarkets[od.marketId]

      const indexToken = getGmxV2TokenByAddress(mkt.market.indexToken)

      const price = BigNumber.from((await this.getMarketPrices([od.marketId]))[0].toFormat(18).value)
        .mul(BigNumber.from(10).pow(indexToken.priceDecimals))
        // dividing by 18 because internal prices are 1e18 precision
        .div(BigNumber.from(10).pow(18))

      let resolvedTriggerPrice = ethers.constants.Zero

      if (od.triggerData) {
        // ensure type is limit
        if (od.type !== 'LIMIT') throw new Error('trigger data supplied with non-limit order')

        // caller needs to ensure trigger price is in 18 decimals
        // trigger direction (above or below) is implicit from contract logic during increase
        resolvedTriggerPrice = BigNumber.from(od.triggerData.triggerPrice.toFormat(18).value)
          .mul(BigNumber.from(10).pow(indexToken.priceDecimals))
          .div(BigNumber.from(10).pow(18))
      }

      // calculate acceptable price for trade
      const acceptablePrice = applySlippage(
        od.triggerData ? resolvedTriggerPrice : price,
        od.slippage ?? DEFAULT_ACCEPTABLE_PRICE_SLIPPAGE,
        od.direction == 'LONG'
      )

      // prepare calldata
      let orderTx = await this.exchangeRouter.populateTransaction.createOrder({
        addresses: {
          receiver: this._smartWallet,
          callbackContract: ethers.constants.AddressZero,
          uiFeeReceiver: ethers.constants.AddressZero,
          market: mkt.market.marketToken,
          initialCollateralToken:
            od.collateral.symbol === 'ETH' ? tokens.WETH.address[42161]! : od.collateral.address[42161]!,
          swapPath: []
        },
        numbers: {
          sizeDeltaUsd: od.sizeDelta.amount.value,
          initialCollateralDeltaAmount: od.marginDelta.amount.value,
          triggerPrice: resolvedTriggerPrice,
          acceptablePrice: acceptablePrice,
          executionFee: DEFAULT_EXEUCTION_FEE,
          callbackGasLimit: ethers.constants.Zero,
          minOutputAmount: ethers.constants.Zero
        },
        orderType: this._mapOrderType(od.type, od.direction),
        decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
        isLong: od.direction == 'LONG',
        shouldUnwrapNativeToken: true,
        referralCode: REFERRAL_CODE
      })

      // set tx value for eth and execution fees
      orderTx.value = DEFAULT_EXEUCTION_FEE

      let requiresErc20Token = true

      if (od.collateral.symbol === 'ETH') {
        orderTx.value = BigNumber.from(od.marginDelta.amount.value).add(orderTx.value)
        requiresErc20Token = false
      }

      // check if collateral token has enough amount approved
      const approvalTx = await this._approveIfNeeded(od.collateral.address[42161]!, od.marginDelta.amount.value)
      if (approvalTx) txs.push(approvalTx)

      const multicallData: string[] = []

      // create send native token tx
      const sendNativeTx = await this.exchangeRouter.populateTransaction.sendWnt(this.ORDER_VAULT_ADDR, orderTx.value)
      multicallData.push(sendNativeTx.data!)

      let sendErc20Tx

      // create send token tx
      if (requiresErc20Token) {
        sendErc20Tx = await this.exchangeRouter.populateTransaction.sendTokens(
          od.collateral.address[42161]!,
          this.ORDER_VAULT_ADDR,
          od.marginDelta.amount.value
        )
        multicallData.push(sendErc20Tx.data!)
      }

      multicallData.push(orderTx.data!)

      // encode as multicall
      const multicallEncoded = await this.exchangeRouter.populateTransaction.multicall(multicallData, {
        value: orderTx.value
      })

      // add metadata for txs
      txs.push({
        tx: multicallEncoded,
        type: 'GMX_V2',
        data: undefined
      })
    }

    return txs
  }

  async updateOrder(orderData: UpdateOrder[]): Promise<UnsignedTxWithMetadata[]> {
    const txs: UnsignedTxWithMetadata[] = []

    for (const od of orderData) {
      // get order details
      const order = await this.reader.getOrder(this.DATASTORE_ADDR, od.orderId)
      if (!order) throw new Error('order not found for updating')

      // check if order can be updated (size delta, trigger price, acceptablePrice) & order type
      if (
        order.numbers.orderType === SolidityOrderType.MarketIncrease ||
        order.numbers.orderType === SolidityOrderType.MarketDecrease
      ) {
        throw new Error('cannot update market order')
      }

      // trigger price must be passed since it is not market order
      if (!od.triggerData) throw new Error('trigger price not provided')

      // take new size delta, trigger price and acceptable price & ignore rest
      const mkt = this.cachedMarkets[od.marketId]

      const indexToken = getGmxV2TokenByAddress(mkt.market.indexToken)

      const triggerPrice = BigNumber.from(od.triggerData.triggerPrice.toFormat(18).value)
        .mul(BigNumber.from(10).pow(indexToken.priceDecimals))
        .div(BigNumber.from(10).pow(18))

      // calculate acceptable price for trade
      const acceptablePrice = applySlippage(triggerPrice, DEFAULT_ACCEPTABLE_PRICE_SLIPPAGE, od.direction == 'LONG')

      // populate update calldata (shouldn't require sending additional collateral or modifying size)
      // size delta should be in usd terms 1e30
      const orderTx = await this.exchangeRouter.populateTransaction.updateOrder(
        od.orderId,
        od.sizeDelta.amount.value,
        acceptablePrice,
        triggerPrice,
        ethers.constants.Zero
      )

      // encode as multicall
      // no msg.value for now but eth can be supplied to unfreeeze frozen orders
      const multicallEncoded = await this.exchangeRouter.populateTransaction.multicall([orderTx.data!])

      // add metadata for txs
      txs.push({
        tx: multicallEncoded,
        type: 'GMX_V2',
        data: undefined
      })
    }

    return txs
  }

  async cancelOrder(orderData: CancelOrder[]): Promise<UnsignedTxWithMetadata[]> {
    const txs: UnsignedTxWithMetadata[] = []

    for (const od of orderData) {
      // get order details
      const order = await this.reader.getOrder(this.DATASTORE_ADDR, od.orderId)
      if (!order) throw new Error('order not found for updating')

      const orderTx = await this.exchangeRouter.populateTransaction.cancelOrder(od.orderId)

      // encode as multicall
      const multicallEncoded = await this.exchangeRouter.populateTransaction.multicall([orderTx.data!])

      // add metadata for txs
      txs.push({
        tx: multicallEncoded,
        type: 'GMX_V2',
        data: undefined
      })
    }

    return txs
  }

  async closePosition(
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[]
  ): Promise<UnsignedTxWithMetadata[]> {
    const txs: UnsignedTxWithMetadata[] = []

    if (positionInfo.length !== closePositionData.length) throw new Error('position close data mismatch')
    if (!this._smartWallet) throw new Error('smart wallet not set in adapter')

    for (let i = 0; i < positionInfo.length; i++) {
      // if market:
      // create oppsition market decrease order of that
      // if stop loss:
      // limit / trigger order at given price in negative direction
      // if take profit
      // limit / trigger order at given price in positive direction

      const orderType = closePositionData[i].triggerData
        ? SolidityOrderType.LimitDecrease
        : SolidityOrderType.MarketDecrease

      // check size to close
      if (closePositionData[i].closeSize.amount.value > positionInfo[i].size.amount.value) {
        throw new Error('close size greater than position')
      }

      if (closePositionData[i].outputCollateral?.address[42161]! !== positionInfo[i].collateral.address[42161]!) {
        // allow for eth or weth
        if (closePositionData[i].outputCollateral!.symbol !== 'ETH')
          throw new Error('requested collateral is not supported')
      }

      // pro-rata close
      const sizeToClose = closePositionData[i].closeSize.amount.value
      const collateralToRemove = BigNumber.from(positionInfo[i].margin.amount.value)
        .mul(sizeToClose)
        .div(positionInfo[i].size.amount.value)

      const mkt = this.cachedMarkets[positionInfo[i].marketId]

      const indexToken = getGmxV2TokenByAddress(mkt.market.indexToken)

      let acceptablePrice
      let triggerPrice

      if (closePositionData[i].triggerData) {
        acceptablePrice = BigNumber.from(closePositionData[i].triggerData!.triggerPrice.toFormat(18).value)
          .mul(BigNumber.from(10).pow(indexToken.priceDecimals))
          .div(BigNumber.from(10).pow(18))

        triggerPrice = acceptablePrice.abs()
      } else {
        acceptablePrice = BigNumber.from((await this.getMarketPrices([positionInfo[i].marketId]))[0].toFormat(18).value)
          .mul(BigNumber.from(10).pow(indexToken.priceDecimals))
          .div(BigNumber.from(10).pow(18))

        triggerPrice = ethers.constants.Zero
      }

      acceptablePrice = applySlippage(
        acceptablePrice,
        DEFAULT_ACCEPTABLE_PRICE_SLIPPAGE,
        positionInfo[i].direction !== 'LONG'
      )

      let orderTx = await this.exchangeRouter.populateTransaction.createOrder({
        addresses: {
          receiver: this._smartWallet,
          callbackContract: ethers.constants.AddressZero,
          uiFeeReceiver: ethers.constants.AddressZero,
          market: positionInfo[i].marketId.split(':')[0],
          initialCollateralToken: tokens.WETH.address[42161]!,
          swapPath: []
        },
        numbers: {
          sizeDeltaUsd: sizeToClose,
          initialCollateralDeltaAmount: collateralToRemove,
          triggerPrice: triggerPrice,
          acceptablePrice: acceptablePrice,
          executionFee: DEFAULT_EXEUCTION_FEE,
          callbackGasLimit: ethers.constants.Zero,
          minOutputAmount: ethers.constants.Zero
        },
        orderType: orderType,
        decreasePositionSwapType: DecreasePositionSwapType.SwapPnlTokenToCollateralToken,
        isLong: positionInfo[i].direction == 'LONG',
        shouldUnwrapNativeToken: closePositionData[i].outputCollateral!.symbol !== 'WETH',
        referralCode: REFERRAL_CODE
      })

      orderTx.value = DEFAULT_EXEUCTION_FEE

      const multicallData: string[] = []

      // create send native token tx
      const sendNativeTx = await this.exchangeRouter.populateTransaction.sendWnt(this.ORDER_VAULT_ADDR, orderTx.value)

      multicallData.push(sendNativeTx.data!)
      multicallData.push(orderTx.data!)

      // encode as multicall
      const multicallEncoded = await this.exchangeRouter.populateTransaction.multicall(multicallData, {
        value: orderTx.value
      })

      // add metadata for txs
      txs.push({
        tx: multicallEncoded,
        type: 'GMX_V2',
        data: undefined
      })
    }

    return txs
  }

  async updatePositionMargin(
    positionInfo: PositionInfo[],
    updatePositionMarginData: UpdatePositionMarginData[]
  ): Promise<UnsignedTxWithMetadata[]> {
    const txs: UnsignedTxWithMetadata[] = []

    if (positionInfo.length !== updatePositionMarginData.length) throw new Error('position close data mismatch')
    if (!this._smartWallet) throw new Error('smart wallet not set in adapter')

    for (let i = 0; i < positionInfo.length; i++) {
      // check collateral is supported
      if (updatePositionMarginData[i].collateral?.address[42161]! !== positionInfo[i].collateral.address[42161]!) {
        // allow for eth or weth
        if (updatePositionMarginData[i].collateral.symbol !== 'ETH')
          throw new Error('requested collateral is not supported')
      }

      // if withdrawing collateral, check if it enough is available, consider unrealizedPnl as well in future
      // always market order
      let orderType
      let initialCollateralToken

      if (updatePositionMarginData[i].isDeposit) {
        orderType = SolidityOrderType.MarketIncrease
        initialCollateralToken = positionInfo[i].collateral.address[42161]!
      } else {
        orderType = SolidityOrderType.MarketDecrease
        initialCollateralToken = tokens.WETH.address[42161]!
      }

      let orderTx = await this.exchangeRouter.populateTransaction.createOrder({
        addresses: {
          receiver: this._smartWallet,
          callbackContract: ethers.constants.AddressZero,
          uiFeeReceiver: ethers.constants.AddressZero,
          market: positionInfo[i].marketId.split(':')[0],
          initialCollateralToken: initialCollateralToken,
          swapPath: []
        },
        numbers: {
          sizeDeltaUsd: ethers.constants.Zero,
          initialCollateralDeltaAmount: updatePositionMarginData[i].margin.amount.value,
          triggerPrice: ethers.constants.AddressZero,
          acceptablePrice: ethers.constants.AddressZero,
          executionFee: DEFAULT_EXEUCTION_FEE,
          callbackGasLimit: ethers.constants.Zero,
          minOutputAmount: ethers.constants.Zero
        },
        orderType: orderType,
        decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
        isLong: positionInfo[i].direction == 'LONG',
        shouldUnwrapNativeToken: true,
        referralCode: REFERRAL_CODE
      })

      orderTx.value = DEFAULT_EXEUCTION_FEE

      let requiresErc20Token = true && updatePositionMarginData[i].isDeposit

      if (updatePositionMarginData[i].collateral.symbol === 'ETH' && updatePositionMarginData[i].isDeposit) {
        orderTx.value = BigNumber.from(updatePositionMarginData[i].margin.amount.value).add(orderTx.value)
        requiresErc20Token = false
      }

      // check if collateral token has enough amount approved
      const approvalTx = await this._approveIfNeeded(
        updatePositionMarginData[i].collateral.address[42161]!,
        updatePositionMarginData[i].margin.amount.value
      )
      if (approvalTx) txs.push(approvalTx)

      let sendErc20Tx
      const multicallData: string[] = []

      // create send token tx
      if (requiresErc20Token) {
        sendErc20Tx = await this.exchangeRouter.populateTransaction.sendTokens(
          updatePositionMarginData[i].collateral.address[42161]!,
          this.ORDER_VAULT_ADDR,
          updatePositionMarginData[i].margin.amount.value
        )
        multicallData.push(sendErc20Tx.data!)
      }

      // create send native token tx
      const sendNativeTx = await this.exchangeRouter.populateTransaction.sendWnt(this.ORDER_VAULT_ADDR, orderTx.value)

      multicallData.push(sendNativeTx.data!)
      multicallData.push(orderTx.data!)

      // encode as multicall
      const multicallEncoded = await this.exchangeRouter.populateTransaction.multicall(multicallData, {
        value: orderTx.value
      })

      // add metadata for txs
      txs.push({
        tx: multicallEncoded,
        type: 'GMX_V2',
        data: undefined
      })
    }

    return txs
  }

  getIdleMargins(wallet: string): Promise<(CollateralData & { marketId: Market['marketId']; amount: FixedNumber })[]> {
    throw new Error('Method not implemented.')
  }

  async getAllPositions(wallet: string, pageOptions: PageOptions | undefined): Promise<PaginatedRes<PositionInfo>> {
    const { marketsInfoData, tokensData, pricesUpdatedAt } = await useMarketsInfo(ARBITRUM, wallet)
    const { positionsInfoData, isLoading: isPositionsLoading } = await usePositionsInfo(ARBITRUM, {
      marketsInfoData,
      tokensData,
      pricesUpdatedAt,
      showPnlInLeverage: false,
      account: wallet
    })

    const positionsInfo: PositionInfo[] = []
    const positionsData = Object.values(positionsInfoData!)
    for (const posData of positionsData) {
      positionsInfo.push({
        marketId: encodeMarketId(arbitrum.id.toString(), 'GMXV2', posData.marketInfo.marketTokenAddress),
        posId: posData.key,
        size: toAmountInfo(posData.sizeInUsd, 30, false),
        margin: toAmountInfo(posData.collateralAmount, posData.collateralToken.decimals, true),
        accessibleMargin: toAmountInfo(posData.remainingCollateralUsd.sub(this.minCollateralUsd), 30, false),
        avgEntryPrice: FixedNumber.fromValue(posData.entryPrice!.toString(), 30, 30),
        cumulativeFunding: FixedNumber.fromValue(
          posData.pendingFundingFeesUsd.add(posData.pendingBorrowingFeesUsd).toString(),
          30,
          30
        ),
        unrealizedPnl: FixedNumber.fromValue(posData.pnlAfterFees.toString(), 30, 30),
        liquidationPrice: FixedNumber.fromValue(posData.liquidationPrice!.toString(), 30, 30),
        leverage: FixedNumber.fromValue(posData.leverage!.toString(), 4, 4),
        direction: posData.isLong ? 'LONG' : 'SHORT',
        collateral: getGmxV2TokenByAddress(posData.collateralTokenAddress),
        indexToken: getGmxV2TokenByAddress(posData.indexToken.address),
        protocolId: 'GMXV2',
        metadata: posData
      })
    }

    return getPaginatedResponse(positionsInfo, pageOptions)
  }

  async _getOrderInfo(wallet: string): Promise<OrdersInfoData> {
    const { marketsInfoData, tokensData, pricesUpdatedAt } = await useMarketsInfo(ARBITRUM, wallet)
    const { positionsInfoData, isLoading: isPositionsLoading } = await usePositionsInfo(ARBITRUM, {
      marketsInfoData,
      tokensData,
      pricesUpdatedAt,
      showPnlInLeverage: false,
      account: wallet
    })
    const { ordersInfoData, isLoading: isOrdersLoading } = await useOrdersInfo(ARBITRUM, {
      account: wallet,
      marketsInfoData,
      positionsInfoData,
      tokensData
    })

    if (!ordersInfoData) throw new Error('orders info not found')
    return ordersInfoData
  }

  async getAllOrders(wallet: string, pageOptions: PageOptions | undefined): Promise<PaginatedRes<OrderInfo>> {
    const ordersInfoData = await this._getOrderInfo(wallet)

    const ordersData = Object.values(ordersInfoData)
    const ordersInfo = ordersData.map((o) => this._mapPositionOrderInfoToOrderInfo(o))

    return getPaginatedResponse(ordersInfo, pageOptions)
  }

  async getAllOrdersForPosition(
    wallet: string,
    positionInfo: PositionInfo[],
    pageOptions: PageOptions | undefined
  ): Promise<Record<PositionInfo['posId'], PaginatedRes<OrderInfo>>> {
    const ordersInfoData = await this._getOrderInfo(wallet)
    const allOrders = Object.values(ordersInfoData)
    const ordersForPositionInternal: Record<string, OrderInfo[]> = {}

    for (const o of allOrders) {
      for (const p of positionInfo) {
        if (isOrderForPosition(o, p.posId)) {
          if (ordersForPositionInternal[p.posId] === undefined) {
            ordersForPositionInternal[p.posId] = []
          }
          ordersForPositionInternal[p.posId].push(this._mapPositionOrderInfoToOrderInfo(o))
        }
      }
    }

    const ordersForPosition: Record<string, PaginatedRes<OrderInfo>> = {}
    for (const posId of Object.keys(ordersForPositionInternal)) {
      ordersForPosition[posId] = getPaginatedResponse(ordersForPositionInternal[posId], pageOptions)
    }

    return ordersForPosition
  }
  async getTradesHistory(wallet: string, pageOptions: PageOptions | undefined): Promise<PaginatedRes<HistoricalTradeInfo>> {

    // console.log(resultJson.data)
    const rawTrades = await this._getOrders(wallet, [2, 3, 4, 5, 6], pageOptions)

    const trades: HistoricalTradeInfo[] = []

    rawTrades.forEach((trade: any) => {
      const marketId = encodeMarketId( arbitrum.id.toString(), 'GMXV2', ethers.utils.getAddress(trade.marketAddress));
      const marketInfo = this.cachedMarkets[marketId]
      const indexToken = getGmxV2TokenByAddress(marketInfo.market.indexToken)
      const initialCollateralToken = getGmxV2TokenByAddress(trade.initialCollateralTokenAddress)
      // if (trade.pnlUsd === null) trade.pnlUsd = '0'
      // if (trade.positionFeeAmount === null) trade.positionFeeAmount = '0'

      const positionFeeUsd = BigInt(trade.positionFee) * BigInt(trade.collateralTokenPriceMax)

      trades.push({
        marketId: marketId,
        timestamp: trade.executedTxn.timestamp,
        price: FixedNumber.fromValue(trade.executionPrice, indexToken.priceDecimals, 30),
        direction: trade.isLong ? 'LONG' as TradeDirection : 'SHORT' as TradeDirection,
        sizeDelta: toAmountInfo(trade.sizeDeltaUsd, 30, false), // USD
        marginDelta: toAmountInfo(trade.initialCollateralDeltaAmount, initialCollateralToken.decimals, true),
        collateral: initialCollateralToken as Token,
        realizedPnl: FixedNumber.fromValue(trade.pnlUsd as string, 30, 30), // USD
        keeperFeesPaid: FixedNumber.fromValue(trade.executionFee, 18, 18), // WETH
        positionFee: FixedNumber.fromValue(positionFeeUsd, 30, 30), // USD
        operationType: this._getOperationType(parseInt(trade.orderType), trade.isLong),
        txHash: trade.executedTxn.hash,
      } as HistoricalTradeInfo)
    });

    return {
      result: trades,
      maxItemsCount: trades.length,
    };
  }

  private async _getOrders(wallet: string, orderTypes: number[], pageOptions: PageOptions | undefined) {
    const results = await fetch(this.SUBGRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{
          orders(
            ${pageOptions ? `skip: ${pageOptions.skip},` : ""}
            ${pageOptions ? `limit: ${pageOptions.limit},` : ""}
              orderBy: executedTxn__timestamp,
              orderDirection: desc,
              ${wallet ? `where: { account: "${wallet.toLowerCase()}", status:Executed, orderType_in: ${JSON.stringify(orderTypes)} }` : ""}
          ) {
              id
              
              account
              marketAddress

              initialCollateralTokenAddress
              initialCollateralDeltaAmount

              sizeDeltaUsd
                            
              orderType
              isLong

              executedTxn {
                  timestamp
                  hash
              }
              executionFee
          }
        }`,
      }),
    });
    const resultJson = await results.json();
    const rawTrades = resultJson.data?.orders

    const rawTradeMap = new Map();
    await rawTrades.forEach((trade: any) => rawTradeMap.set(trade.executedTxn.hash, trade))

    const rawTradeHashes = Array.from(rawTradeMap.keys())

    const tradeActionsResult = await fetch(this.SUBGRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{
          tradeActions(
            where : {transaction_in: ${JSON.stringify(rawTradeHashes)}}
          ) {
            eventName
            marketAddress
            orderKey
            orderType

            transaction {
              hash
            }
            account
            isLong
            executionPrice

            collateralTokenPriceMax
            initialCollateralTokenAddress
            initialCollateralDeltaAmount
            fundingFeeAmount
            positionFeeAmount
            borrowingFeeAmount
            pnlUsd
          }
        }`,
      }),
    });

    const tradeActionsResultJson = await tradeActionsResult.json()
    const rawTradeActions = tradeActionsResultJson.data?.tradeActions

    await rawTradeActions.forEach((tradeAction: any) => {
      const rawTrade = rawTradeMap.get(tradeAction.transaction.hash)
      if (!rawTrade) return
      rawTrade.executionPrice = this._checkNull(tradeAction.executionPrice)
      rawTrade.pnlUsd = this._checkNull(tradeAction.pnlUsd)
      rawTrade.collateralTokenPriceMax = this._checkNull(tradeAction.collateralTokenPriceMax)
      rawTrade.positionFee = BigInt(this._checkNull(tradeAction.positionFeeAmount)) + BigInt(this._checkNull(tradeAction.borrowingFeeAmount)) + BigInt(this._checkNull(tradeAction.fundingFeeAmount))
      rawTradeMap.set(tradeAction.transaction.hash, rawTrade)
    })

    const out = Array.from(rawTradeMap.values())
    return out;
  }

  private _checkNull(value: any) {
    if (value === null) return '0'
    return value
  }

  private _getOperationType(orderType: SolidityOrderType, isLong: boolean): TradeOperationType {
    switch (orderType) {
      case SolidityOrderType.MarketIncrease:
      case SolidityOrderType.LimitIncrease:
        return isLong ? 'Open Long' : 'Open Short'
      case SolidityOrderType.MarketDecrease:
      case SolidityOrderType.LimitDecrease:
      case SolidityOrderType.StopLossDecrease:
        return isLong ? 'Close Long' : 'Close Short'
      default: throw new Error('Invalid order type')
    }
  }

  async getLiquidationHistory(wallet: string, pageOptions: PageOptions | undefined): Promise<PaginatedRes<LiquidationInfo>> {
    const rawTrades = await this._getOrders(wallet, [7], pageOptions)

    const liquidations: LiquidationInfo[] = []

    rawTrades.forEach((trade: any) => {
      const marketId = encodeMarketId(arbitrum.id.toString(), 'GMXV2', ethers.utils.getAddress(trade.marketAddress));
      const marketInfo = this.cachedMarkets[marketId]
      const indexToken = getGmxV2TokenByAddress(marketInfo.market.indexToken)
      const initialCollateralToken = getGmxV2TokenByAddress(trade.initialCollateralTokenAddress)
      // if (trade.pnlUsd === null) trade.pnlUsd = '0'
      // if (trade.positionFeeAmount === null) trade.positionFeeAmount = '0'

      const positionFeeUsd = BigInt(trade.positionFee) * BigInt(trade.collateralTokenPriceMax)
      const remainingCollateralUsd = BigInt(trade.initialCollateralDeltaAmount) * BigInt(trade.collateralTokenPriceMax)

      liquidations.push({
        marketId: marketId,
        timestamp: trade.executedTxn.timestamp,
        liquidationPrice: FixedNumber.fromValue(trade.executionPrice, indexToken.priceDecimals, 30),
        direction: trade.isLong ? 'LONG' as TradeDirection : 'SHORT' as TradeDirection,
        sizeClosed: toAmountInfo(trade.sizeDeltaUsd, 30, false), // USD
        remainingCollateral: toAmountInfo(trade.initialCollateralDeltaAmount, initialCollateralToken.decimals, true),
        collateral: initialCollateralToken as Token,
        realizedPnl: FixedNumber.fromValue(trade.pnlUsd as string, 30, 30), // USD
        liquidationFees: FixedNumber.fromValue(trade.executionFee, 18, 18), // WETH
        liqudationLeverage: remainingCollateralUsd != BigInt(0) ? FixedNumber.fromValue(trade.sizeDeltaUsd, 30, 30).div(FixedNumber.fromValue(remainingCollateralUsd, 30, 30)) : FixedNumber.fromValue(0, 30, 30), // USD
        txHash: trade.executedTxn.hash,
      } as LiquidationInfo)
    });

    return {
      result: liquidations,
      maxItemsCount: liquidations.length,
    };

  }
  
  
  async getOpenTradePreview(
    wallet: string,
    orderData: CreateOrder[],
    existingPos: (PositionInfo | undefined)[]
  ): Promise<OpenTradePreviewInfo[]> {
    const { marketsInfoData, tokensData, pricesUpdatedAt } = await useMarketsInfo(ARBITRUM, wallet)
    const { minCollateralUsd, minPositionSizeUsd } = await usePositionsConstants(ARBITRUM)
    if (!marketsInfoData || !tokensData || !minCollateralUsd || !minPositionSizeUsd) throw new Error('Info not found')

    const previewsInfo: OpenTradePreviewInfo[] = []

    for (let i = 0; i < orderData.length; i++) {
      const od = orderData[i]
      const ePos = existingPos[i]
      const marketInfo = marketsInfoData[this.cachedMarkets[od.marketId].market.marketToken]
      const toToken = tokensData[marketInfo.indexToken.address]
      const fromToken = tokensData[od.collateral.address[42161]!]
      const orderSizeDelta = getBNFromFN(od.sizeDelta.amount.toFormat(30))
      const orderTriggerPrice = getBNFromFN(od.triggerData!.triggerPrice.toFormat(30))
      const orderMarginDelta = getBNFromFN(od.marginDelta.amount.toFormat(fromToken.decimals))
      const existingPosition = ePos?.metadata as InternalPositionInfo

      const toTokenAmount = convertToTokenAmount(
        orderSizeDelta,
        toToken.decimals,
        od.type === 'MARKET' ? toToken.prices.maxPrice : orderTriggerPrice
      )!
      const fromUsdMin = convertToUsd(
        orderMarginDelta,
        fromToken.decimals,
        getIsEquivalentTokens(fromToken, toToken) ? orderTriggerPrice : fromToken.prices.minPrice
      )!

      const leverage = orderSizeDelta.mul(BASIS_POINTS_DIVISOR).div(fromUsdMin)

      const increaseAmounts = getIncreasePositionAmounts({
        marketInfo,
        indexToken: toToken,
        initialCollateralToken: fromToken,
        collateralToken: fromToken, // this would change if we allow in-gmxv2 swaps
        isLong: od.direction === 'LONG',
        initialCollateralAmount: orderMarginDelta,
        indexTokenAmount: toTokenAmount,
        leverage: leverage,
        triggerPrice: od.type === 'LIMIT' ? orderTriggerPrice : undefined,
        position: existingPosition,
        savedAcceptablePriceImpactBps: BigNumber.from(100),
        userReferralInfo: undefined, // TODO set referral info
        strategy: 'leverageByCollateral'
      })

      const nextPositionValues = getNextPositionValuesForIncreaseTrade({
        marketInfo,
        collateralToken: fromToken,
        existingPosition: existingPosition,
        isLong: od.direction === 'LONG',
        collateralDeltaUsd: increaseAmounts.collateralDeltaUsd,
        collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
        sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
        sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
        indexPrice: increaseAmounts.indexPrice,
        showPnlInLeverage: false,
        minCollateralUsd,
        userReferralInfo: undefined // TODO set referral info
      })

      const fees = getTradeFees({
        isIncrease: true,
        initialCollateralUsd: increaseAmounts.initialCollateralUsd,
        sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
        swapSteps: increaseAmounts.swapPathStats?.swapSteps || [],
        positionFeeUsd: increaseAmounts.positionFeeUsd,
        swapPriceImpactDeltaUsd: increaseAmounts.swapPathStats?.totalSwapPriceImpactDeltaUsd || BigNumber.from(0),
        positionPriceImpactDeltaUsd: increaseAmounts.positionPriceImpactDeltaUsd,
        borrowingFeeUsd: existingPosition?.pendingBorrowingFeesUsd || BigNumber.from(0),
        fundingFeeUsd: existingPosition?.pendingFundingFeesUsd || BigNumber.from(0),
        feeDiscountUsd: increaseAmounts.feeDiscountUsd,
        swapProfitFeeUsd: BigNumber.from(0)
      })

      const priceDiff = nextPositionValues.nextEntryPrice!.sub(toToken.prices.maxPrice).abs()
      const priceImpact = od.type === 'LIMIT' ? ZERO : priceDiff.mul(BASIS_POINTS_DIVISOR).div(toToken.prices.maxPrice)

      previewsInfo.push({
        collateral: od.collateral,
        marketId: od.marketId,
        leverage: FixedNumber.fromValue(nextPositionValues.nextLeverage!.toString(), 4, 4),
        size: toAmountInfo(nextPositionValues.nextSizeUsd!, 30, false),
        margin: toAmountInfo(nextPositionValues.nextCollateralUsd!, 30, true),
        avgEntryPrice: FixedNumber.fromValue(nextPositionValues.nextEntryPrice!.toString(), 30, 30),
        liqudationPrice: FixedNumber.fromValue(nextPositionValues.nextLiqPrice!.toString(), 30, 30),
        fee: FixedNumber.fromValue(
          fees.positionFee!.deltaUsd.add(fees.borrowFee!.deltaUsd).add(fees.fundingFee!.deltaUsd).toString(),
          30,
          30
        ),
        priceImpact: FixedNumber.fromValue(priceImpact.toString(), 4, 4),
        isError: false,
        errMsg: ''
      })
    }

    return previewsInfo
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
    marketIds: Market['marketId'][],
    isDeposit: boolean[],
    marginDelta: AmountInfo[],
    existingPos: (PositionInfo | undefined)[]
  ): Promise<PreviewInfo[]> {
    throw new Error('Method not implemented.')
  }

  ///////////////////////////////////
  //// Internal helper functions ////
  ///////////////////////////////////

  private _convertNative(address: string) {
    return address === ethers.constants.AddressZero ? GMX_V2_TOKENS['WETH'].address[42161]! : address
  }

  private async _getOraclePrices(): Promise<Array<{ [key: string]: string }>> {
    const pricesUrl = `https://arbitrum-api.gmxinfra.io/prices/tickers`
    const pricesRes = await fetch(pricesUrl)
    const resJson = (await pricesRes.json()) as Array<{ [key: string]: string }>

    return resJson
  }

  private _getMinMaxPrice(
    tokenAddr: string,
    priceRes: Array<{ [key: string]: string }>
  ): {
    minPrice: string
    maxPrice: string
    priceDecimals: number
  } {
    const tokenInfo = priceRes.find(
      (p) => p.tokenAddress.toLowerCase() === this._convertNative(tokenAddr).toLowerCase()
    )
    if (tokenInfo === undefined) throw new Error(`Price for ${tokenAddr} not found`)

    const priceDecimals = getGmxV2TokenByAddress(tokenAddr).priceDecimals

    return {
      minPrice: tokenInfo.minPrice,
      maxPrice: tokenInfo.maxPrice,
      priceDecimals: priceDecimals
    }
  }

  private async _getContractMarketPrices(marketIds: string[]): Promise<ContractMarketPrices[]> {
    const markets = await this.getMarketsInfo(marketIds)
    const priceRes = await this._getOraclePrices()

    const contractMarketPrices: ContractMarketPrices[] = []
    for (const m of markets) {
      const indexPrice = this._getMinMaxPrice(m.indexToken.address[42161]!, priceRes)
      const longPrice = this._getMinMaxPrice(m.longCollateral[0].address[42161]!, priceRes)
      const shortPrice = this._getMinMaxPrice(m.shortCollateral[1].address[42161]!, priceRes)

      const marketPrice: ContractMarketPrices = {
        indexTokenPrice: {
          min: BigNumber.from(indexPrice.minPrice),
          max: BigNumber.from(indexPrice.maxPrice)
        },
        longTokenPrice: {
          min: BigNumber.from(longPrice.minPrice),
          max: BigNumber.from(longPrice.maxPrice)
        },
        shortTokenPrice: {
          min: BigNumber.from(shortPrice.minPrice),
          max: BigNumber.from(shortPrice.maxPrice)
        }
      }

      contractMarketPrices.push(marketPrice)
    }

    return contractMarketPrices
  }

  private _getMarketTokenFromMarketId(marketId: string): string {
    return marketId.split(':')[0]
  }

  private async _getMarketIdFromContractPositionKey(contractPositionKey: string, account: string): Promise<string> {
    const allMarkets = await this.supportedMarkets(this.supportedChains())

    for (const market of allMarkets) {
      const marketToken = this._getMarketTokenFromMarketId(market.marketId)
      const longCollateral = market.longCollateral[0].address[42161]!
      const shortCollateral = market.shortCollateral[1].address[42161]!

      const collaterals =
        longCollateral.toLowerCase() === shortCollateral.toLowerCase()
          ? [longCollateral]
          : [longCollateral, shortCollateral]

      for (const collateralAddress of collaterals) {
        for (const isLong of [true, false]) {
          const derivedContractPositionKey = hashedPositionKey(account, marketToken, collateralAddress, isLong)

          if (derivedContractPositionKey === contractPositionKey) {
            return market.marketId
          }
        }
      }
    }

    throw new Error(`Market not found for contract position key ${contractPositionKey}`)
  }

  private getOrderType(iot: InternalOrderType): OrderType {
    if (isMarketOrderType(iot)) {
      return 'MARKET'
    }
    if (iot === InternalOrderType.LimitIncrease) {
      return 'LIMIT'
    }
    if (iot === InternalOrderType.LimitDecrease) {
      return 'TAKE_PROFIT'
    }
    if (iot === InternalOrderType.StopLossDecrease) {
      return 'STOP_LOSS'
    }

    throw new Error(`Order type not found for internal order type ${iot}`)
  }

  private _mapPositionOrderInfoToOrderInfo(orderData: PositionOrderInfo): OrderInfo {
    const initialCollateralToken = getGmxV2TokenByAddress(orderData.initialCollateralTokenAddress)
    const oData: OrderData = {
      marketId: encodeMarketId(arbitrum.id.toString(), 'GMXV2', orderData.marketInfo.marketTokenAddress),
      direction: orderData.isLong ? 'LONG' : 'SHORT',
      sizeDelta: toAmountInfo(orderData.sizeDeltaUsd, 30, false),
      marginDelta: toAmountInfo(orderData.initialCollateralDeltaAmount, initialCollateralToken.decimals, true),
      triggerData: {
        triggerPrice: FixedNumber.fromValue(orderData.triggerPrice.toString(), 30, 30),
        triggerAboveThreshold: orderData.triggerThresholdType == TriggerThresholdType.Above ? true : false
      }
    }
    const oId: OrderIdentifier = {
      orderId: orderData.key,
      marketId: encodeMarketId(arbitrum.id.toString(), 'GMXV2', orderData.marketInfo.marketTokenAddress)
    }
    const oType = {
      orderType: this.getOrderType(orderData.orderType)
    }
    const oCollateralData: CollateralData = {
      collateral: initialCollateralToken
    }
    const oProtocolId = {
      protocolId: 'GMXV2' as ProtocolId
    }

    const orderInfo: OrderInfo = {
      ...oData,
      ...oId,
      ...oType,
      ...oCollateralData,
      ...oProtocolId
    }

    return orderInfo
  }

  private _getMarketSymbol(token: GMX_V2_TOKEN): string {
    return token.symbol === 'WETH' ? 'ETH' : token.symbol
  }

  private async _buildCacheIfEmpty() {
    if (!(Object.keys(this.cachedMarkets).length > 0)) await this.supportedMarkets(this.supportedChains())
  }
}
