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
import {
  DataStore__factory,
  Reader,
  Reader__factory,
  ExchangeRouter__factory,
  IERC20__factory
} from '../../typechain/gmx-v2'
import { BigNumber, ethers } from 'ethers'
import { ZERO } from '../common/constants'
import { applySlippage, toAmountInfo } from '../common/helper'
import { arbitrum } from 'viem/chains'
import { GMX_V2_TOKENS, getGmxV2TokenByAddress } from '../configs/gmxv2/gmxv2Tokens'
import { parseUnits } from 'ethers/lib/utils'
import { accountPositionListKey, hashedPositionKey } from '../configs/gmxv2/dataStore'
import { ContractMarketPrices } from '../configs/gmxv2/types'
import { getPositionKey } from '../configs/gmxv2/utils'
import { OrderType } from '../interfaces/V1/IRouterAdapterBaseV1'
import { OrderDirection } from '../interface'
import { tokens } from '../common/tokens'

export const DEFAULT_ACCEPTABLE_PRICE_SLIPPAGE = 1
export const DEFAULT_EXEUCTION_FEE = ethers.utils.parseEther('0.00121')

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

export default class GmxV2Service implements IAdapterV1 {
  private READER_ADDR = '0xf60becbba223EEA9495Da3f606753867eC10d139'
  private DATASTORE_ADDR = '0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8'
  private EXCHANGE_ROUTER = '0x7C68C7866A64FA2160F78EEaE12217FFbf871fa8'

  private ROUTER_ADDR = '0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6'
  private ORDER_VAULT_ADDR = '0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5'
  private REFERRAL_STORAGE_ADDR = '0xe6fab3f0c7199b0d34d7fbe83394fc0e0d06e99d'

  private provider = rpc[42161]

  private reader = Reader__factory.connect(this.READER_ADDR, this.provider)
  private datastore = DataStore__factory.connect(this.DATASTORE_ADDR, this.provider)
  private exchangeRouter = ExchangeRouter__factory.connect(this.EXCHANGE_ROUTER, this.provider)

  private cachedMarkets: Record<
    string,
    {
      marketInfo: MarketInfo
      market: Awaited<ReturnType<Reader['getMarket']>>
    }
  > = {}

  private _smartWallet: string | undefined

  setup(swAddr: string): Promise<void> {
    this._smartWallet = ethers.utils.getAddress(swAddr)
    return Promise.resolve()
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
    // get from cache if available
    if (Object.keys(this.cachedMarkets).length > 0) return Object.values(this.cachedMarkets).map((m) => m.marketInfo)

    const marketProps = await this.reader.getMarkets(this.DATASTORE_ADDR, 0, 1000)

    const marketsInfo: MarketInfo[] = []
    for (const mProp of marketProps) {
      const longToken = getGmxV2TokenByAddress(mProp.longToken)
      const shortToken = getGmxV2TokenByAddress(mProp.shortToken)

      const market: Market = {
        marketId: this.getGlobalMarketId(mProp.marketToken, 'GMXV2', arbitrum.id),
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
    const priceRes = await this.getOraclePrices()

    for (const mInfo of marketsInfo) {
      const tokenPrice = this.getMinMaxPrice(mInfo.indexToken.address[42161]!, priceRes)

      // get mid price for calculations and display on f/e
      const price = BigNumber.from(tokenPrice.minPrice).add(BigNumber.from(tokenPrice.maxPrice)).div(2)

      prices.push(FixedNumber.fromValue(price.toString(), tokenPrice.priceDecimals))
    }

    return prices
  }

  async getMarketsInfo(marketIds: string[]): Promise<MarketInfo[]> {
    const marketsInfo: MarketInfo[] = []

    for (const mId of marketIds) {
      const marketInfo = this.cachedMarkets[mId]
      if (marketInfo === undefined) throw new Error(`Market ${mId} not found`)

      marketsInfo.push(marketInfo.marketInfo)
    }

    return marketsInfo
  }

  getDynamicMarketMetadata(marketIds: string[]): Promise<DynamicMarketMetadata[]> {
    throw new Error('Method not implemented.')
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

      const price = (await this.getMarketPrices([od.marketId]))[0]

      let resolvedTriggerPrice = ethers.constants.Zero;

      if (od.triggerData) {
        // ensure type is limit
        if (od.type !== 'LIMIT') throw new Error('trigger data supplied with non-limit order')

        // caller needs to ensure trigger price is in 18 decimals
        // trigger direction (above or below) is implicit from contract logic during increase
        resolvedTriggerPrice = BigNumber.from(od.triggerData.triggerPrice.value)
          .mul(BigNumber.from(10).pow(indexToken.priceDecimals))
          .div(BigNumber.from(10).pow(indexToken.decimals))
      }

      // calculate acceptable price for trade
      const acceptablePrice = applySlippage(
        od.triggerData ? resolvedTriggerPrice : BigNumber.from(price.value),
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
      const sendNativeTx = await this.exchangeRouter.populateTransaction.sendWnt(
        this.ORDER_VAULT_ADDR,
        orderTx.value
      )
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

  updateOrder(orderData: UpdateOrder[]): Promise<UnsignedTxWithMetadata[]> {
    const txs: UnsignedTxWithMetadata[] = []
    return Promise.resolve(txs)
  }

  cancelOrder(orderData: CancelOrder[]): Promise<UnsignedTxWithMetadata[]> {
    const txs: UnsignedTxWithMetadata[] = []
    return Promise.resolve(txs)
  }

  closePosition(
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[]
  ): Promise<UnsignedTxWithMetadata[]> {
    const txs: UnsignedTxWithMetadata[] = []
    return Promise.resolve(txs)
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

    const keyHash = accountPositionListKey(wallet)
    const positionKeys = await this.datastore.getBytes32ValuesAt(keyHash, indexes.start, indexes.end)
    const marketIds = await Promise.all(positionKeys.map((k) => this.getMarketIdFromContractPositionKey(k, wallet)))
    const marketPrices = await this.getContractMarketPrices(marketIds)

    const protocolPositionsData = await this.reader.getAccountPositionInfoList(
      this.DATASTORE_ADDR,
      this.REFERRAL_STORAGE_ADDR,
      positionKeys,
      marketPrices,
      ethers.constants.AddressZero
    )

    console.dir({ protocolPositionsData }, { depth: 4 })

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

  private convertNative(address: string) {
    return address === ethers.constants.AddressZero ? GMX_V2_TOKENS['WETH'].address[42161]! : address
  }

  private async getOraclePrices(): Promise<Array<{ [key: string]: string }>> {
    const pricesUrl = `https://arbitrum-api.gmxinfra.io/prices/tickers`
    const pricesRes = await fetch(pricesUrl)
    const resJson = (await pricesRes.json()) as Array<{ [key: string]: string }>

    return resJson
  }

  private getMinMaxPrice(
    tokenAddr: string,
    priceRes: Array<{ [key: string]: string }>
  ): {
    minPrice: string
    maxPrice: string
    priceDecimals: number
  } {
    const tokenInfo = priceRes.find((p) => p.tokenAddress.toLowerCase() === this.convertNative(tokenAddr).toLowerCase())
    if (tokenInfo === undefined) throw new Error(`Price for ${tokenAddr} not found`)

    const priceDecimals = getGmxV2TokenByAddress(tokenAddr).priceDecimals

    return {
      minPrice: tokenInfo.minPrice,
      maxPrice: tokenInfo.maxPrice,
      priceDecimals: priceDecimals
    }
  }

  private async getContractMarketPrices(marketIds: string[]): Promise<ContractMarketPrices[]> {
    const markets = await this.getMarketsInfo(marketIds)
    const priceRes = await this.getOraclePrices()

    const contractMarketPrices: ContractMarketPrices[] = []
    for (const m of markets) {
      const indexPrice = this.getMinMaxPrice(m.indexToken.address[42161]!, priceRes)
      const longPrice = this.getMinMaxPrice(m.longCollateral[0].address[42161]!, priceRes)
      const shortPrice = this.getMinMaxPrice(m.shortCollateral[1].address[42161]!, priceRes)

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

  private getMarketTokenFromMarketId(marketId: string): string {
    return marketId.split(':')[0]
  }

  private async getMarketIdFromContractPositionKey(contractPositionKey: string, account: string): Promise<string> {
    const allMarkets = await this.supportedMarkets(this.supportedNetworks())

    for (const market of allMarkets) {
      const marketToken = this.getMarketTokenFromMarketId(market.marketId)
      const longCollateral = market.longCollateral[0].address[42161]!
      const shortCollateral = market.shortCollateral[1].address[42161]!

      const collaterals =
        longCollateral.toLowerCase() === shortCollateral.toLowerCase()
          ? [longCollateral]
          : [longCollateral, shortCollateral]

      for (const collateralAddress of collaterals) {
        for (const isLong of [true, false]) {
          const positionKey = getPositionKey(account, marketToken, collateralAddress, isLong)

          const derivedContractPositionKey = hashedPositionKey(account, marketToken, collateralAddress, isLong)

          if (derivedContractPositionKey === contractPositionKey) {
            return market.marketId
          }
        }
      }
    }

    throw new Error(`Market not found for contract position key ${contractPositionKey}`)
  }
}
