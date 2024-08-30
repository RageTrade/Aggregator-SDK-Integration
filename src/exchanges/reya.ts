import type { MarginAccountEntity, MarketEntity, PositionEntity, PositionHistoryEntity } from '@reyaxyz/api-sdk'
import { ApiClient } from '@reyaxyz/api-sdk'
import { ConditionalOrderType } from '@reyaxyz/common'
import { CommunityClient } from '@reyaxyz/community-sdk'
import type { GetAccountLGEStatusResult } from '@reyaxyz/community-sdk/src/modules/lge/types'
import { configureSDK, createAccount } from '@reyaxyz/sdk'
import type { Chain } from 'viem'

import { FixedNumber } from '../../fixedNumber'
import { CACHE_DAY, CACHE_MINUTE, CACHE_SECOND, CACHE_TIME_MULT, getStaleTime } from '../common/cache'
import { ZERO_FN } from '../common/constants'
import { getPaginatedResponse, toAmountInfoFN, validDenomination } from '../common/helper'
import { decodeRawMarketId, encodeMarketId } from '../common/markets'
import type { Token } from '../common/tokens'
import { tokens } from '../common/tokens'
import { getReqdLeverageFN, toLowerTick, toNearestTick } from '../configs/aevo/helper'
import {
  CANNOT_CHANGE_MODE,
  CLOSE_SIZE_ZERO,
  closePreErrRes,
  LEV_OUT_OF_BOUNDS,
  MARGIN_DENOMINATION_TOKEN,
  openPreErrRes,
  SIZE_DENOMINATION_TOKEN
} from '../configs/hyperliquid/hlErrors'
import { REYA_COLLATERAL_TOKEN } from '../configs/reya/chains'
import { reya, REYA_TOKENS_MAP } from '../configs/reya/config'
import { mapResolution, reyaMarketIdToAsset } from '../configs/reya/helper'
import {
  reyaCacheGetAllMarkets,
  reyaCacheGetLiquidationHistory,
  reyaCacheGetMarginAccount,
  reyaCacheGetMaxExposure,
  reyaCacheGetTradeHistory,
  reyaCacheGetXpInfo
} from '../configs/reya/reyaCacheHelper'
import {
  signApproveAndDeposit,
  signCancelOrder,
  signOrder,
  signTriggerOrder,
  signUpdateOrder,
  signWithdraw
} from '../configs/reya/signing'
import type {
  AccountInfo,
  ActionParam,
  AgentParams,
  AgentState,
  AmountInfo,
  ApiOpts,
  AuthParams,
  AvailableToTradeParams,
  CancelOrder,
  ClaimInfo,
  ClosePositionData,
  CloseTradePreviewInfo,
  CreateOrder,
  DepositWithdrawParams,
  DynamicMarketMetadata,
  GenericStaticMarketMetadata,
  GetBarsParams,
  HistoricalTradeInfo,
  IAdapterV1,
  IdleMarginInfo,
  LiquidationInfo,
  Market,
  MarketInfo,
  MarketState,
  OpenTradePreviewInfo,
  OrderBook,
  OrderInfo,
  PageOptions,
  PaginatedRes,
  PnlData,
  PositionInfo,
  PreviewInfo,
  Protocol,
  ProtocolId,
  ProtocolInfo,
  TradeData,
  TVBar,
  UpdateOrder,
  UpdatePositionMarginData
} from '../interfaces'

ApiClient.configure('production')
CommunityClient.configure('production')
configureSDK('production')
export class ReyaAdapterV1 implements IAdapterV1 {
  protocolId: ProtocolId = 'REYA'
  marginAccountId: number = 0

  async deposit(params: DepositWithdrawParams[]): Promise<ActionParam[]> {
    const txs: ActionParam[] = []
    for (const each of params) {
      if (each.protocol !== 'REYA') throw new Error('invalid protocol id')
      console.log(this.marginAccountId, 'margin account')
      // if (each.chainId !== arbitrum.id || each.chainId !== optimism.id) throw new Error('chain id mismatch')
      txs.push(signApproveAndDeposit(each.chainId, this.marginAccountId, Number(each.amount), each.token.address))
    }
    return txs
  }

  getProtocolInfo(): ProtocolInfo {
    const info: ProtocolInfo = {
      hasAgent: false,
      hasAccount: true,
      hasOrderbook: false,
      sizeDeltaInToken: true,
      explicitFundingClaim: false,
      collateralDeltaInToken: true,
      collateralUsesLimitPricing: false,
      minimumDepositAmountUsd: FixedNumber.fromString('10'),
      depositData: {
        10: [tokens['USDC.e']],
        42161: [tokens['USDC.e']],
        81457: []
      }
    }

    return info
  }

  authenticateAgent(agentParams: AgentParams[], wallet: string, opts?: ApiOpts): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }

  async cancelOrder(orderData: CancelOrder[], _: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    const payload: ActionParam[] = []
    for (const each of orderData) {
      payload.push(signCancelOrder(each.orderId))
    }

    return payload
  }

  claimFunding(wallet: string, opts?: ApiOpts): Promise<ActionParam[]> {
    return Promise.resolve([])
  }

  clearCredentials(): void {}

  async closePosition(
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[],
    wallet: string,
    opts?: ApiOpts | undefined
  ): Promise<ActionParam[]> {
    const payload: ActionParam[] = []
    const sTimeMarkets = getStaleTime(CACHE_SECOND, opts)
    const allMarkets = (await reyaCacheGetAllMarkets(sTimeMarkets, sTimeMarkets * CACHE_TIME_MULT, opts)).filter(
      (m) => m.isActive
    )
    if (positionInfo.length !== closePositionData.length) throw new Error('length mismatch')

    for (let i = 0; i < positionInfo.length; ++i) {
      const closeData = closePositionData[i]
      const positionInfoData = positionInfo[i]

      if (closeData.outputCollateral && closeData.outputCollateral.symbol !== REYA_COLLATERAL_TOKEN.symbol)
        throw new Error('token not supported')

      // ensure size delta is in token terms
      if (!closeData.closeSize.isTokenAmount) throw new Error('size delta required in token terms')

      // reject ALO
      if (closeData.tif === 'ALO') throw new Error('ALO not supported')

      const market = allMarkets.find((m) => m.quoteToken === decodeRawMarketId(positionInfoData.marketId))
      if (!market) throw new Error('Market not found')

      let sizeDelta = Number(closeData.closeSize.amount._value)
      sizeDelta = toLowerTick(sizeDelta, Number(market.baseSpacing))
      const isBuy = positionInfoData.direction === 'LONG'

      const amount = isBuy ? -sizeDelta : sizeDelta
      if (closeData.type == 'MARKET') {
        payload.push(signOrder(this.marginAccountId, amount, market))
        continue
      }

      if (!closeData.triggerData) throw new Error('trigger data required')

      if (closeData.type === 'STOP_LOSS_LIMIT' || closeData.type === 'TAKE_PROFIT_LIMIT') {
        throw new Error('Stop loss and take profit limit orders are not supported')
      }

      const orderType =
        closeData.type === 'STOP_LOSS' ? ConditionalOrderType.STOP_LOSS : ConditionalOrderType.TAKE_PROFIT

      payload.push(
        signTriggerOrder(this.marginAccountId, amount, Number(closeData.triggerData.triggerPrice), orderType, market)
      )
    }

    return payload
  }

  async getAccountInfo(wallet: string, opts?: ApiOpts): Promise<AccountInfo[]> {
    const sTimeMarkets = getStaleTime(CACHE_DAY, opts)
    const marginAccount: MarginAccountEntity = await reyaCacheGetMarginAccount(
      this.marginAccountId,
      sTimeMarkets,
      sTimeMarkets * CACHE_TIME_MULT,
      opts
    )
    const accountInfo: AccountInfo = {
      protocolId: 'REYA',
      accountInfoData: {
        accountEquity: FixedNumber.fromString(String(marginAccount.totalBalanceWithHaircut)),
        availableToTrade: FixedNumber.fromString(
          String(marginAccount.totalBalanceWithHaircut - marginAccount.liquidationMarginRequirement)
        ),
        storedCollateral: marginAccount.collaterals.map((c) => ({
          token: c.token,
          amount: FixedNumber.fromString(String(Number(c.balance).toFixed(18)))
        }))
      }
    }

    return [accountInfo]
  }

  getAgentState(wallet: string, agentParams: AgentParams[], opts?: ApiOpts): Promise<AgentState[]> {
    throw new Error('Method not implemented.')
  }

  async getAllOrders(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<OrderInfo>> {
    const ordersInfo: OrderInfo[] = []
    const sTimeMarkets = getStaleTime(CACHE_DAY, opts)
    const marginAccount: MarginAccountEntity = await reyaCacheGetMarginAccount(
      this.marginAccountId,
      sTimeMarkets,
      sTimeMarkets * CACHE_TIME_MULT,
      opts
    )
    const perpPositions: PositionEntity[] = marginAccount.positions

    for (let i = 0; i < perpPositions.length; i++) {
      const position = perpPositions[i]

      const direction = position.base > 0 ? 'LONG' : 'SHORT'
      const sizeDelta = FixedNumber.fromString(String(position.base))
      const asset = position.market.quoteToken
      const tradeData: TradeData = {
        marketId: encodeMarketId(reya.id.toString(), this.protocolId, asset),
        direction: direction,
        sizeDelta: toAmountInfoFN(sizeDelta, true),
        marginDelta: toAmountInfoFN(FixedNumber.fromString('0'), false) // @todo check if we want to expose margin account
      }

      if (position.conditionalOrdersInfo?.stopLoss) {
        ordersInfo.push({
          ...tradeData,
          mode: 'CROSS',
          triggerData: {
            triggerPrice: FixedNumber.fromString(String(position.conditionalOrdersInfo?.stopLoss.stopLossPrice)),
            triggerAboveThreshold: direction == 'SHORT',
            triggerLimitPrice: undefined
          },
          marketId: encodeMarketId(reya.id.toString(), this.protocolId, asset),
          orderId: position.conditionalOrdersInfo.stopLoss.orderId,
          orderType: 'STOP_LOSS',
          collateral: REYA_COLLATERAL_TOKEN,
          protocolId: this.protocolId,
          tif: 'GTC'
        })
      }

      if (position.conditionalOrdersInfo?.takeProfit) {
        ordersInfo.push({
          ...tradeData,
          mode: 'CROSS',
          triggerData: {
            triggerPrice: FixedNumber.fromString(String(position.conditionalOrdersInfo?.takeProfit.takeProfitPrice)),
            triggerAboveThreshold: direction == 'LONG',
            triggerLimitPrice: undefined
          },
          marketId: encodeMarketId(reya.id.toString(), this.protocolId, asset),
          orderId: position.conditionalOrdersInfo.takeProfit.orderId,
          orderType: 'TAKE_PROFIT',
          collateral: REYA_COLLATERAL_TOKEN,
          protocolId: this.protocolId,
          tif: 'GTC'
        })
      }
    }

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
        if (o.marketId === p.marketId) {
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

  async getAllPositions(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<PositionInfo>> {
    const sTimeMarkets = getStaleTime(CACHE_DAY, opts)
    await reyaCacheGetAllMarkets(sTimeMarkets, sTimeMarkets * CACHE_TIME_MULT, opts)

    const positions: PositionInfo[] = []
    const marginAccount: MarginAccountEntity = await reyaCacheGetMarginAccount(
      this.marginAccountId,
      sTimeMarkets,
      sTimeMarkets * CACHE_TIME_MULT,
      opts
    )
    const perpPositions: PositionEntity[] = marginAccount.positions

    for (let i = 0; i < perpPositions.length; i++) {
      const pos = perpPositions[i]
      const marketId = encodeMarketId(reya.id.toString(), this.protocolId, pos.market.quoteToken)
      const posSize = FixedNumber.fromString(String(pos.base))
      const posNtl = posSize.mulFN(FixedNumber.fromString(String(pos.market.markPrice)))
      const leverage = posNtl.abs().div(FixedNumber.fromString(String(marginAccount.totalBalanceWithHaircut)))
      const marginUsed = posNtl.divFN(leverage)
      const direction = pos.side == 'long' ? 'LONG' : 'SHORT'

      const fundingFee = FixedNumber.fromString(String(Number(pos.fundingPnl).toFixed(18)))
      const rawPnl = FixedNumber.fromString(String(Number(pos.realisedPnl).toFixed(18)))
      const aggregatePnl = rawPnl.subFN(fundingFee)

      const upnl: PnlData = {
        aggregatePnl: aggregatePnl,
        rawPnl: rawPnl,
        borrowFee: ZERO_FN,
        fundingFee: fundingFee
      }

      const posInfo: PositionInfo = {
        marketId: encodeMarketId(reya.id.toString(), this.protocolId, pos.market.quoteToken),
        posId: `${marketId}-${direction}-${marginAccount.id}`,
        size: toAmountInfoFN(posSize, true),
        margin: toAmountInfoFN(marginUsed, false),
        accessibleMargin: toAmountInfoFN(ZERO_FN, false),
        avgEntryPrice: FixedNumber.fromString(String(pos.price)),
        cumulativeFunding: fundingFee,
        unrealizedPnl: upnl,
        liquidationPrice: FixedNumber.fromString(String(pos.liquidationPrice)),
        leverage: leverage,
        direction: direction,
        collateral: REYA_COLLATERAL_TOKEN,
        indexToken: REYA_TOKENS_MAP[pos.market.quoteToken],
        protocolId: this.protocolId,
        roe: aggregatePnl.divFN(marginUsed),
        mode: 'CROSS',
        metadata: pos
      }

      positions.push(posInfo)
    }

    return getPaginatedResponse(positions, pageOptions)
  }

  async getAvailableToTrade(
    wallet: string,
    params: AvailableToTradeParams<this['protocolId']>,
    opts?: ApiOpts | undefined
  ): Promise<AmountInfo> {
    const sTimeAccount = getStaleTime(CACHE_SECOND * 3, opts)
    const acccountData = await reyaCacheGetMarginAccount(this.marginAccountId, sTimeAccount, sTimeAccount, opts)
    return toAmountInfoFN(
      FixedNumber.fromString(
        String(Number(acccountData.totalBalanceWithHaircut - acccountData.liquidationMarginRequirement).toFixed(18))
      ),
      false
    )
  }

  getClaimHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts
  ): Promise<PaginatedRes<ClaimInfo>> {
    throw new Error('Method not implemented.')
  }

  async getCloseTradePreview(
    wallet: string,
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[],
    opts?: ApiOpts | undefined
  ): Promise<CloseTradePreviewInfo[]> {
    const previewsInfo: CloseTradePreviewInfo[] = []
    const sTimeMarkets = getStaleTime(CACHE_SECOND, opts)
    const allMarkets = (await reyaCacheGetAllMarkets(sTimeMarkets, sTimeMarkets * CACHE_TIME_MULT, opts)).filter(
      (m) => m.isActive
    )
    for (let i = 0; i < positionInfo.length; i++) {
      const pos = positionInfo[i]
      const cpd = closePositionData[i]
      const asset = reyaMarketIdToAsset(pos.marketId)
      const market = allMarkets.find((m) => m.quoteToken === asset)
      if (!market) throw new Error('Market not found')

      const mp = FixedNumber.fromString(String(Number(market.markPrice).toFixed(18)))
      const closeSizeRounded = toLowerTick(Number(cpd.closeSize.amount._value), Number(market.baseSpacing))
      const closeSize = FixedNumber.fromString(closeSizeRounded.toString())
      const posSize = pos.size.amount
      const isMarket = cpd.type == 'MARKET'
      const isSpTlLimit = cpd.type == 'STOP_LOSS_LIMIT' || cpd.type == 'TAKE_PROFIT_LIMIT'
      const trigPriceOrig = isMarket
        ? mp
        : isSpTlLimit
          ? cpd.triggerData!.triggerLimitPrice!
          : cpd.triggerData!.triggerPrice
      const trigPrice = trigPriceOrig
      const ml = pos.leverage

      await ApiClient.tradeSimulation.arm({
        marketId: market.id,
        marginAccountId: this.marginAccountId
      })

      let isError = false
      let errMsg = ''
      if (!validDenomination(cpd.closeSize, true)) throw new Error(SIZE_DENOMINATION_TOKEN)
      if (closeSize.isZero()) {
        isError = true
        errMsg = CLOSE_SIZE_ZERO
        previewsInfo.push(closePreErrRes(pos.marketId, true, true, REYA_COLLATERAL_TOKEN, errMsg))
        continue
      }

      const simulation = ApiClient.tradeSimulation.simulate({
        amount: pos.direction === 'LONG' ? -Number(closeSize) : Number(closeSize),
        fromBase: true
      })

      const fee = FixedNumber.fromString(String(Number(simulation.fees).toFixed(18)))

      const remainingSize = posSize.subFN(closeSize)
      const marginReqByPos = remainingSize.mulFN(trigPrice).divFN(ml)

      const liqPrice = FixedNumber.fromString(String(Number(simulation.liquidationPrice).toFixed(18)))

      const preview: CloseTradePreviewInfo = {
        marketId: pos.marketId,
        collateral: pos.collateral,
        leverage: remainingSize.isZero() ? ZERO_FN : ml,
        size: toAmountInfoFN(remainingSize, true),
        margin: toAmountInfoFN(marginReqByPos, true),
        avgEntryPrice: pos.avgEntryPrice,
        liqudationPrice: liqPrice,
        fee: fee,
        receiveMargin: toAmountInfoFN(ZERO_FN, true),
        isError: isError,
        errMsg: errMsg
      }

      previewsInfo.push(preview)
    }

    return previewsInfo
  }

  async getDynamicMarketMetadata(marketIds: string[], opts?: ApiOpts | undefined): Promise<DynamicMarketMetadata[]> {
    const dynamicMarketMetadata: DynamicMarketMetadata[] = []
    const sTimeMarkets = getStaleTime(CACHE_DAY, opts)
    const markets = await reyaCacheGetAllMarkets(sTimeMarkets, sTimeMarkets * CACHE_TIME_MULT, opts)
    const maxExposures = await reyaCacheGetMaxExposure(sTimeMarkets, sTimeMarkets * CACHE_TIME_MULT, opts)
    for (let i = 0; i < marketIds.length; i++) {
      const mId = marketIds[i]
      const asset = reyaMarketIdToAsset(mId)
      const marketEntity = markets.find((cg) => cg.quoteToken === asset)
      if (marketEntity) {
        const maxExposureLong = maxExposures.find((m) => m.marketId === marketEntity.id && m.type === 'long')
        const maxExposureShort = maxExposures.find((m) => m.marketId === marketEntity.id && m.type === 'short')
        dynamicMarketMetadata.push({
          oiLong: FixedNumber.fromString(String(Number(marketEntity.longOI).toFixed(18))).mul(
            FixedNumber.fromString(String(Number(marketEntity.markPrice).toFixed(18)))
          ),
          oiShort: FixedNumber.fromString(String(Number(marketEntity.shortOI))).mul(
            FixedNumber.fromString(Number(marketEntity.markPrice).toFixed(18))
          ),
          isOiBifurcated: true,
          availableLiquidityLong: FixedNumber.fromString(
            String(Number(maxExposureLong?.maxAmountSize || 0).toFixed(18))
          ),
          availableLiquidityShort: FixedNumber.fromString(
            String(Number(maxExposureShort?.maxAmountSize || 0).toFixed(18))
          ),
          longFundingRate: FixedNumber.fromString(String(Number(marketEntity.fundingRateAnnualized).toFixed(18))).mulFN(
            FixedNumber.fromString('-1')
          ),
          shortFundingRate: FixedNumber.fromString(String(Number(marketEntity.fundingRateAnnualized).toFixed(18))),
          longBorrowRate: ZERO_FN,
          shortBorrowRate: ZERO_FN
        })
      } else {
        throw new Error(`No stats found for asset ${asset}`)
      }
    }

    return dynamicMarketMetadata
  }

  getIdleMargins(wallet: string, opts?: ApiOpts): Promise<Array<IdleMarginInfo>> {
    throw new Error('Method not implemented.')
  }

  async getLiquidationHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<LiquidationInfo>> {
    const liquidations: LiquidationInfo[] = []

    const historyDataPromise = reyaCacheGetLiquidationHistory(wallet, 0, 0, opts)
    const supportedMarketsPromise = this.supportedMarkets(this.supportedChains(), opts)

    const [historyData, supportedMarkets] = await Promise.all([historyDataPromise, supportedMarketsPromise])

    if (historyData) {
      const liquidationHistory = historyData.data
      for (const lh of liquidationHistory) {
        const asset = lh.baseUnderlyingToken
        const marketId = encodeMarketId(reya.id.toString(), this.protocolId, asset)
        const market = supportedMarkets.find((m) => m.marketId === marketId)
        const direction = lh.base > 0 ? 'LONG' : 'SHORT'
        const tradeFee = FixedNumber.fromString(String(lh.fees))
        const totalFees = tradeFee

        liquidations.push({
          collateral: REYA_COLLATERAL_TOKEN,
          marketId: marketId,
          liquidationPrice: FixedNumber.fromString(String(lh.executionPrice)),
          direction: direction,
          sizeClosed: toAmountInfoFN(FixedNumber.fromString(String(lh.base)), true),
          realizedPnl: ZERO_FN,
          liquidationFees: totalFees,
          remainingCollateral: toAmountInfoFN(FixedNumber.fromString('0'), true),
          liqudationLeverage: market?.maxLeverage || ZERO_FN,
          timestamp: Math.floor(Number(lh.timestamp) / 1000), // miliseconds to seconds
          txHash: '',
          id: lh.id
        })
      }
    }

    return getPaginatedResponse(liquidations, pageOptions)
  }

  async getMarketPrices(marketIds: string[], opts?: ApiOpts | undefined): Promise<FixedNumber[]> {
    const sTimePrices = getStaleTime(CACHE_SECOND * 2, opts)
    const allMarkets = (await reyaCacheGetAllMarkets(sTimePrices, sTimePrices, opts)).filter((m) => m.isActive)

    return marketIds.map((marketId) => {
      const market = allMarkets.find((m) => m.quoteToken == reyaMarketIdToAsset(marketId))
      return market ? FixedNumber.fromString(String(market.markPrice)) : ZERO_FN
    })
  }

  async getMarketState(wallet: string, marketIds: string[], opts?: ApiOpts | undefined): Promise<MarketState[]> {
    const sTimeMarkets = getStaleTime(CACHE_DAY, opts)
    await reyaCacheGetAllMarkets(sTimeMarkets, sTimeMarkets * CACHE_TIME_MULT, opts)

    const marketStates: MarketState[] = []

    const sTimeAccount = getStaleTime(CACHE_SECOND * 3, opts)
    const acccountData = await reyaCacheGetMarginAccount(this.marginAccountId, sTimeAccount, sTimeAccount, opts)
    for (let i = 0; i < marketIds.length; i++) {
      const mId = marketIds[i]
      const asset = reyaMarketIdToAsset(mId)
      let lev = ZERO_FN
      const position = acccountData.positions.find((p) => p.market.quoteToken === asset)

      if (position) {
        lev = FixedNumber.fromString(String(Number(position.size).toFixed(18)))
          .abs()
          .div(FixedNumber.fromString(String(Number(acccountData.totalBalanceWithHaircut).toFixed(18))))
      }

      const marketState: MarketState = {
        marketMode: 'CROSS',
        leverage: FixedNumber.fromString(String(lev)) // get leverage per marker
      }
      marketStates.push(marketState)
    }

    return marketStates
  }

  async getMarketsInfo(marketIds: string[], opts?: ApiOpts | undefined): Promise<MarketInfo[]> {
    const marketInfo: MarketInfo[] = []

    const supportedMarkets = await this.supportedMarkets(this.supportedChains(), opts)

    marketIds.forEach((mId) => {
      const market = supportedMarkets.find((m) => m.marketId === mId)
      if (market) {
        marketInfo.push(market)
      }
    })

    return marketInfo
  }

  async getOpenTradePreview(
    wallet: string,
    orderData: CreateOrder[],
    existingPos: (PositionInfo | undefined)[],
    opts?: ApiOpts | undefined
  ): Promise<OpenTradePreviewInfo[]> {
    const sTimeMarkets = getStaleTime(CACHE_SECOND, opts)
    const allMarkets = (await reyaCacheGetAllMarkets(sTimeMarkets, sTimeMarkets * CACHE_TIME_MULT, opts)).filter(
      (m) => m.isActive
    )
    const previewsInfo: OpenTradePreviewInfo[] = []

    for (let i = 0; i < orderData.length; i++) {
      const od = orderData[i]
      const pos = existingPos[i]
      const actPos = pos ? (pos.metadata as NonNullable<PositionEntity>) : undefined

      const market = allMarkets.find((m) => m.quoteToken === decodeRawMarketId(od.marketId))
      if (!market) throw new Error('Market not found')
      const mp = FixedNumber.fromString(String(Number(market.markPrice).toFixed(18)))

      await ApiClient.tradeSimulation.arm({
        marketId: market.id,
        marginAccountId: this.marginAccountId
      })

      let isError = false
      let errMsg = ''

      if (!validDenomination(od.sizeDelta, true)) throw new Error(SIZE_DENOMINATION_TOKEN)
      if (!validDenomination(od.marginDelta, true)) throw new Error(MARGIN_DENOMINATION_TOKEN)

      if (pos && pos.mode !== od.mode) {
        isError = true
        errMsg = CANNOT_CHANGE_MODE
        previewsInfo.push(openPreErrRes(od.marketId, true, true, REYA_COLLATERAL_TOKEN, errMsg))
        continue
      }

      const isMarket = od.type == 'MARKET'
      // floor sizeDelta as per the tick size
      const sizeDeltaRounded = toLowerTick(Number(od.sizeDelta.amount._value), Number(market.baseSpacing))
      const orderSize = FixedNumber.fromString(sizeDeltaRounded.toString())

      if (sizeDeltaRounded === 0) {
        isError = true
        errMsg = '(Rounded) Pos size cannot be zero'
        previewsInfo.push(openPreErrRes(od.marketId, true, true, REYA_COLLATERAL_TOKEN, errMsg))
        continue
      }

      // round trig price to nearest tick
      const trigPriceOrig = isMarket ? mp : od.triggerData!.triggerPrice
      const trigPriceRounded = toNearestTick(Number(trigPriceOrig._value), Number(market.baseSpacing))
      const trigPrice = FixedNumber.fromString(trigPriceRounded.toString())

      const actPosSize = actPos ? FixedNumber.fromString(String(Number(actPos.base).toFixed(18))) : ZERO_FN
      const actPosAvgEntryPrice = actPos ? FixedNumber.fromString(String(Number(actPos.price).toFixed(18))) : ZERO_FN

      const lev = FixedNumber.fromString(
        getReqdLeverageFN(od.sizeDelta.amount, od.marginDelta.amount, trigPrice).toString()
      )
      const curLev = pos ? pos.leverage : ZERO_FN
      if (pos && lev.lt(curLev)) {
        isError = true
        errMsg = LEV_OUT_OF_BOUNDS
        previewsInfo.push(openPreErrRes(od.marketId, true, true, REYA_COLLATERAL_TOKEN, errMsg))
        continue
      }

      const nextSize = pos
        ? pos.direction === od.direction
          ? actPosSize.addFN(orderSize).abs()
          : actPosSize.subFN(orderSize).abs()
        : orderSize

      const simulation = ApiClient.tradeSimulation.simulate({
        amount: od.direction === 'LONG' ? Number(orderSize) : -Number(orderSize),
        fromBase: true
      })
      // next margin is always position / leverage
      const nextMargin = nextSize.mulFN(trigPrice).divFN(lev)

      const nextEntryPrice = FixedNumber.fromString(String(Number(simulation.estimatedPrice).toFixed(18)))
      let avgEntryPrice = nextEntryPrice
      let nextDirection = od.direction
      if (actPos && pos) {
        if (pos.direction === od.direction) {
          // average entry price
          // posSize * posEntryPrice + orderSize * orderEntryPrice / (posSize + orderSize)
          avgEntryPrice = actPosSize.mulFN(actPosAvgEntryPrice).addFN(orderSize.mulFN(nextEntryPrice)).divFN(nextSize)
        } else {
          if (actPosSize.gt(orderSize)) {
            // partial close would result in previous entry price
            avgEntryPrice = actPosAvgEntryPrice
            // direction would be same as position
            nextDirection = pos.direction
          } else {
            // direction would change and hence newer entry price would be the avgEntryprice
            avgEntryPrice = nextEntryPrice
          }
        }
      }
      // if accountData is not set return liqPrice as 0 so that it is autorouter compatible
      const liqPrice = FixedNumber.fromString(String(Number(simulation.liquidationPrice).toFixed(18)))

      const fee = FixedNumber.fromString(String(Number(simulation.fees).toFixed(18)))
      const priceImpact = FixedNumber.fromString(String(Number(simulation.estimatedSlippage).toFixed(18)))

      const preview = {
        marketId: od.marketId,
        collateral: od.collateral,
        leverage: lev,
        size: toAmountInfoFN(nextSize, true),
        margin: toAmountInfoFN(nextMargin, false),
        avgEntryPrice: avgEntryPrice,
        liqudationPrice: liqPrice,
        fee: fee,
        priceImpact: priceImpact,
        isError: isError,
        errMsg: errMsg
      }

      previewsInfo.push(preview)
    }

    return previewsInfo
  }

  getOrderBooks(
    marketIds: Market['marketId'][],
    precision: (number | undefined)[],
    opts?: ApiOpts
  ): Promise<OrderBook[]> {
    throw new Error('Method not implemented.')
  }

  getTotalAccuredFunding(wallet: string, opts?: ApiOpts): Promise<FixedNumber> {
    throw new Error('Method not implemented.')
  }

  getTotalClaimableFunding(wallet: string, opts?: ApiOpts): Promise<FixedNumber> {
    throw new Error('Method not implemented.')
  }

  async getTradesHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<HistoricalTradeInfo>> {
    const trades: HistoricalTradeInfo[] = []
    const tradesHistory: PositionHistoryEntity[] = await reyaCacheGetTradeHistory(
      wallet,
      this.marginAccountId,
      0,
      0,
      opts
    )

    for (const th of tradesHistory) {
      const asset = th.market.quoteToken
      const marketId = encodeMarketId(reya.id.toString(), this.protocolId, asset)
      const direction = th.action == 'long-trade' ? 'LONG' : 'SHORT'
      const size = FixedNumber.fromString(String(th.base))
      const tradeData: TradeData = {
        marketId: marketId,
        direction: direction,
        sizeDelta: toAmountInfoFN(size, true),
        marginDelta: toAmountInfoFN(ZERO_FN, true) // marginDelta is not available in trade history
      }

      const tradeInfo: HistoricalTradeInfo = {
        ...tradeData,
        collateral: REYA_COLLATERAL_TOKEN,
        timestamp: Math.floor(Number(th.timestamp) / 1000), // milliseconds to seconds
        indexPrice: FixedNumber.fromString(String(th.executionPrice)),
        collateralPrice: FixedNumber.fromString('1'),
        realizedPnl: FixedNumber.fromString(String(th.realisedPnl)),
        keeperFeesPaid: FixedNumber.fromString('0'),
        positionFee: FixedNumber.fromString(String(th.fees)),
        operationType: direction == 'LONG' ? 'Open Long' : 'Open Short',
        txHash: '', // txHash is not available in trade history
        id: String(th.id)
      }

      trades.push(tradeInfo)
    }

    return getPaginatedResponse(trades, pageOptions)
  }

  getUpdateMarginPreview(
    wallet: string,
    isDeposit: boolean[],
    marginDelta: AmountInfo[],
    existingPos: Array<PositionInfo>,
    opts?: ApiOpts
  ): Promise<PreviewInfo[]> {
    throw new Error('Method not implemented.')
  }

  // increase position
  async increasePosition(orderData: CreateOrder[], wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    const payload: ActionParam[] = []
    const sTimeMarkets = getStaleTime(CACHE_SECOND, opts)
    const allMarkets = (await reyaCacheGetAllMarkets(sTimeMarkets, sTimeMarkets * CACHE_TIME_MULT, opts)).filter(
      (m) => m.isActive
    )
    for (const each of orderData) {
      if (each.collateral.symbol !== REYA_COLLATERAL_TOKEN.symbol) throw new Error('token not supported')
      if (!each.sizeDelta.isTokenAmount) throw new Error('size delta required in token terms')

      const market = allMarkets.find((m) => m.quoteToken === decodeRawMarketId(each.marketId))
      if (!market) throw new Error('Market not found')
      const sizeDelta = toLowerTick(Number(each.sizeDelta.amount._value), Number(market.baseSpacing))
      const amount = each.direction === 'LONG' ? sizeDelta : -sizeDelta
      payload.push(signOrder(this.marginAccountId, amount, market))
    }
    return payload
  }

  async init(wallet: string | undefined, opts?: ApiOpts): Promise<void> {
    // create margin account
    if (!wallet) throw new Error('wallet address required')
    const accounts = await ApiClient.account.getMarginAccounts({
      address: wallet
    })
    if (accounts.length > 0) {
      this.marginAccountId = accounts[0].id
      return
    }

    const result = await createAccount({
      ownerAddress: wallet,
      name: 'Rage Trade Account'
    })

    if (!result.accountId) throw new Error('Margin account not created')
    this.marginAccountId = result.accountId
  }

  setCredentials(auth: AuthParams<this['protocolId']>): Promise<void> {
    throw new Error('Method not implemented.')
  }

  supportedChains(opts?: ApiOpts): Chain[] {
    return [reya]
  }

  async supportedMarkets(chains: Chain[] | undefined, opts?: ApiOpts | undefined): Promise<MarketInfo[]> {
    const marketInfo: MarketInfo[] = []

    if (chains == undefined || chains.includes(reya)) {
      const sTimeMarkets = getStaleTime(CACHE_DAY, opts)
      const allMarkets = (await reyaCacheGetAllMarkets(sTimeMarkets, sTimeMarkets * CACHE_TIME_MULT, opts)).filter(
        (m) => m.isActive
      )

      allMarkets.forEach((m: MarketEntity) => {
        const market: Market = {
          marketId: encodeMarketId(reya.id.toString(), this.protocolId, m.quoteToken),
          chain: reya,
          indexToken: REYA_TOKENS_MAP[m.quoteToken],
          longCollateral: [REYA_COLLATERAL_TOKEN],
          shortCollateral: [REYA_COLLATERAL_TOKEN],
          supportedModes: {
            ISOLATED: false,
            CROSS: true
          },
          supportedOrderTypes: {
            LIMIT: false,
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
          marketSymbol: m.quoteToken,
          isQuoteTokenUSD: true,
          metadata: m
        }

        const staticMetadata: GenericStaticMarketMetadata = {
          maxLeverage: FixedNumber.fromString(String(m.maxLeverage)),
          minLeverage: FixedNumber.fromString('1'),
          minInitialMargin: FixedNumber.fromString('1'),
          minPositionSize: FixedNumber.fromString(String(m.minOrderSize)),
          minPositionSizeToken: FixedNumber.fromString(String(m.minOrderSizeBase)),
          minLimitPositionSize: FixedNumber.fromString(String(m.minOrderSize)),
          maxPrecision: 1,
          amountStep: FixedNumber.fromString(String(m.baseSpacing)),
          priceStep: FixedNumber.fromString('0.0001')
        }

        const protocol: Protocol = {
          protocolId: 'REYA'
        }

        marketInfo.push({
          ...market,
          ...staticMetadata,
          ...protocol
        })
      })
    }

    return marketInfo
  }

  async updateOrder(orderData: UpdateOrder[], wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    const payload: ActionParam[] = []

    // get all orders for account//
    const sTimeMarket = getStaleTime(CACHE_SECOND, opts)
    const allMarkets = (await reyaCacheGetAllMarkets(sTimeMarket, sTimeMarket * CACHE_TIME_MULT, opts)).filter(
      (m) => m.isActive
    )

    for (const each of orderData) {
      // ensure size delta is in token terms
      if (!each.sizeDelta.isTokenAmount) throw new Error('size delta required in token terms')
      // ensure trigger data is present
      if (!each.triggerData) throw new Error('trigger data required but not present')

      const amount = each.direction === 'LONG' ? Number(each.sizeDelta) : -Number(each.sizeDelta)
      if (each.orderType === 'STOP_LOSS_LIMIT' || each.orderType === 'TAKE_PROFIT_LIMIT') {
        throw new Error('Stop loss and take profit limit orders are not supported')
      }
      const orderType =
        each.orderType === 'STOP_LOSS' ? ConditionalOrderType.STOP_LOSS : ConditionalOrderType.TAKE_PROFIT

      const market = allMarkets.find((m) => m.quoteToken === decodeRawMarketId(each.marketId))
      if (!market) throw new Error('Market not found')
      payload.push(
        signUpdateOrder(
          each.orderId,
          this.marginAccountId,
          amount,
          Number(each.triggerData?.triggerPrice),
          orderType,
          market
        )
      )
    }
    return payload
  }
  updatePositionMargin(
    positionInfo: PositionInfo[],
    updatePositionMarginData: UpdatePositionMarginData[],
    wallet: string,
    opts?: ApiOpts
  ): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }

  async withdraw(params: DepositWithdrawParams[]): Promise<ActionParam[]> {
    const payload: ActionParam[] = []

    for (const each of params) {
      if (each.protocol !== 'REYA') throw new Error('invalid protocol id')
      payload.push(
        signWithdraw(
          each.chainId,
          this.marginAccountId,
          {
            address: each.wallet.toLowerCase() as Lowercase<string>
          },
          Number(each.amount),
          each.token.address
        )
      )
    }

    return payload
  }

  async getXpInfo(wallet: string | undefined, opts?: ApiOpts): Promise<number> {
    if (!wallet) throw new Error('wallet address required')

    const sTimeXp = getStaleTime(CACHE_MINUTE, opts)
    const result: GetAccountLGEStatusResult = await reyaCacheGetXpInfo(wallet, sTimeXp, sTimeXp * CACHE_TIME_MULT, opts)

    return Number(result.xp.value)
  }

  async getBars(params: GetBarsParams): Promise<TVBar[]> {
    const { symbolInfo, resolution, from, to } = params

    const sTimeMarkets = getStaleTime(CACHE_DAY)
    const allMarkets = (await reyaCacheGetAllMarkets(sTimeMarkets, sTimeMarkets * CACHE_TIME_MULT)).filter(
      (m) => m.isActive
    )
    const symbol = symbolInfo.split('-')[0]

    const market = allMarkets.find((m) => m.quoteToken === symbol)

    if (!market) throw new Error('market not found')

    const result = await ApiClient.markets.getMarketCandles({
      marketId: market.id,
      resolution: mapResolution(resolution),
      fromISO: new Date(from * 1000).toISOString(),
      toISO: new Date(to * 1000).toISOString()
    })

    const bars: TVBar[] = []

    for (const candle of result.candles) {
      bars.push({
        time: new Date(candle.startedAt).getTime(),
        low: Number(candle.low),
        high: Number(candle.high),
        open: Number(candle.open),
        close: Number(candle.close),
        volume: 0
      })
    }

    return bars
  }

  getDepositWithdrawTime(
    action: 'Deposit' | 'Withdraw',
    isEthChain: boolean,
    isArbitrumChain: boolean,
    isOptimismChain: boolean
  ): {
    deposit: string
    withdraw: string
  } {
    return {
      deposit: '5 Mins',
      withdraw: '5 Mins'
    }
  }

  getMatchingPosition(
    positions: PositionInfo[],
    market: MarketInfo,
    collateralToken: Token,
    order: 'long' | 'short'
  ): PositionInfo | undefined {
    return positions.find((p) => p.marketId === market.marketId)
  }

  async getWithdrawableBalance(
    wallet: string,
    collateralToken: Token,
    market: MarketInfo,
    opts?: ApiOpts
  ): Promise<FixedNumber> {
    const sTimeAccount = getStaleTime(CACHE_SECOND, opts)
    const marginAccount: MarginAccountEntity = await reyaCacheGetMarginAccount(
      this.marginAccountId,
      sTimeAccount,
      sTimeAccount * CACHE_TIME_MULT,
      opts
    )

    const collateral = marginAccount.collaterals.find(
      (c) => c.token.toLowerCase() === collateralToken.symbol.toLowerCase()
    )
    if (!collateral) return FixedNumber.fromString('0')

    return FixedNumber.fromString(String(Number(collateral.balance).toFixed(18)))
  }

  isOrderForPosition(order: OrderInfo, position: PositionInfo): boolean {
    return order.marketId === position.marketId
  }
}
