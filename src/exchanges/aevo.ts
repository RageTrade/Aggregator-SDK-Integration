import { Chain } from 'viem'
import { FixedNumber, mulFN } from '../common/fixedNumber'
import { ActionParam } from '../interfaces/IActionExecutor'
import { IAdapterV1, ProtocolInfo } from '../interfaces/V1/IAdapterV1'
import {
  ProtocolId,
  AvailableToTradeParams,
  ApiOpts,
  AmountInfo,
  DepositWithdrawParams,
  MarketInfo,
  DynamicMarketMetadata,
  CreateOrder,
  UpdateOrder,
  CancelOrder,
  AgentParams,
  PositionInfo,
  ClosePositionData,
  UpdatePositionMarginData,
  IdleMarginInfo,
  PageOptions,
  PaginatedRes,
  OrderInfo,
  HistoricalTradeInfo,
  LiquidationInfo,
  ClaimInfo,
  OpenTradePreviewInfo,
  CloseTradePreviewInfo,
  PreviewInfo,
  AccountInfo,
  MarketState,
  AgentState,
  OrderBook,
  Market,
  GenericStaticMarketMetadata,
  Protocol
} from '../interfaces/V1/IRouterAdapterBaseV1'
import { optimism, arbitrum } from 'viem/chains'
import { aevoAddresses } from '../configs/aevo/addresses'
import { L1SocketDepositHelper, L1SocketDepositHelper__factory } from '../../typechain/aevo'
import { rpc } from '../common/provider'
import { Token, tokens } from '../common/tokens'
import { IERC20__factory } from '../../typechain/gmx-v2'
import { IERC20 } from '../../typechain/gmx-v1'
import { BigNumber, ethers } from 'ethers'
import { AEVO_DEPOSIT_H, EMPTY_DESC, getApproveTokenHeading } from '../common/buttonHeadings'
import { formatEther } from 'ethers/lib/utils'
import { hyperliquid } from '../configs/hyperliquid/api/config'
import { AevoClient } from '../../generated/aevo'
import {
  AEVO_CACHE_PREFIX,
  CACHE_DAY,
  CACHE_MINUTE,
  CACHE_SECOND,
  CACHE_TIME_MULT,
  cacheFetch,
  getStaleTime
} from '../common/cache'
import { AEVO_COLLATERAL_TOKEN, AEVO_TOKENS_MAP, aevo, aevoUpdateTokensMap } from '../configs/aevo/config'
import { encodeMarketId } from '../common/markets'
import { ZERO_FN } from '../common/constants'
import { aevoMarketIdToAsset } from '../configs/aevo/helper'

class ExtendedAevoClient extends AevoClient {
  public static setCredentials(apiKey: string, apiSecret: string) {}
}

export default class AevoAdapterV1 implements IAdapterV1 {
  protocolId: ProtocolId = 'AEVO'

  private static AEVO_GAS_LIMIT = 650_000
  private static AEVO_GAS_LIMIT_WITH_BUFFER = 650_000 + 65_000 // 10% buffer

  private aevoClient = new ExtendedAevoClient()

  private publicApi = this.aevoClient.publicApi
  private privateApi = this.aevoClient.privateApi

  private contracts: Record<Chain['id'], L1SocketDepositHelper> = {
    10: L1SocketDepositHelper__factory.connect(aevoAddresses[optimism.id].socketHelper, rpc[10]),
    42161: L1SocketDepositHelper__factory.connect(aevoAddresses[arbitrum.id].socketHelper, rpc[42161])
  }

  private tokenSpentApprovedMap: Record<string, boolean> = {}

  getProtocolInfo(): ProtocolInfo {
    throw new Error('Method not implemented.')
  }

  getAvailableToTrade(
    wallet: string,
    params: AvailableToTradeParams<this['protocolId']>,
    opts?: ApiOpts | undefined
  ): Promise<AmountInfo> {
    throw new Error('Method not implemented.')
  }

  init(wallet: string | undefined, opts?: ApiOpts | undefined): Promise<void> {
    throw new Error('Method not implemented.')
  }

  setup(): Promise<ActionParam[]> {
    return Promise.resolve([])
  }

  async _approveIfNeeded(
    wallet: string,
    spender: string,
    amount: bigint,
    chainId: Chain['id'],
    token: { contract: IERC20; data: Token }
  ): Promise<ActionParam | undefined> {
    const key = `${wallet}-${token}-${spender}`
    if (this.tokenSpentApprovedMap[key]) return

    const allowance = await token.contract.allowance(wallet, spender)

    // if allowance is 80% of Max then
    if (allowance.gt(ethers.constants.MaxUint256.mul(8).div(10))) {
      this.tokenSpentApprovedMap[key] = true
    }

    if (allowance.gt(amount)) return

    const tx = await token.contract.populateTransaction.approve(spender, ethers.constants.MaxUint256)

    return {
      tx,
      chainId,
      isUserAction: true,
      heading: getApproveTokenHeading(token.data.symbol),
      desc: EMPTY_DESC
    }
  }

  async _getExtraBridgeFee(chainId: Chain['id'], connector: string) {
    const key = [AEVO_CACHE_PREFIX, 'getExtraBridgeFee', chainId, connector]

    const url = `https://prod.dlapi.socket.tech/estimate-min-fees?srcPlug=${connector}&srcChainSlug=${chainId}&dstChainSlug=2999&msgGasLimit=${AevoAdapterV1.AEVO_GAS_LIMIT_WITH_BUFFER}&dstValue=1`

    return cacheFetch({
      key,
      fn: async () => Number(((await (await fetch(url)).json()) as { status: 'SUCCESS'; result: string }).result),
      staleTime: 5 * CACHE_MINUTE,
      cacheTime: 2 * 5 * CACHE_MINUTE
    })
  }

  async deposit(params: DepositWithdrawParams[]): Promise<ActionParam[]> {
    const payload: ActionParam[] = []

    for (const each of params) {
      // check if token is eth or not
      const isNativeETH = each.token.symbol === tokens.ETH.symbol

      // get gas price
      const connector = aevoAddresses[each.chainId].connector[isNativeETH ? 'WETH' : each.token.symbol]
      const additional = BigNumber.from(await this._getExtraBridgeFee(each.chainId, connector))

      const amount = each.amount.toFormat(each.token.decimals).value

      const ethRequired = isNativeETH ? additional.add(amount) : additional

      if (isNativeETH) {
        const tx = await this.contracts[each.chainId].populateTransaction.depositETHToAppChain(
          each.wallet,
          amount,
          AevoAdapterV1.AEVO_GAS_LIMIT,
          aevoAddresses[each.chainId].connector['WETH'],
          '0x',
          {
            value: ethRequired
          }
        )

        payload.push({
          tx,
          ethRequired,
          desc: EMPTY_DESC,
          isUserAction: true,
          chainId: each.chainId,
          isAgentRequired: false,
          heading: AEVO_DEPOSIT_H
        })

        continue
      }

      if (each.protocol !== 'AEVO') throw new Error('invalid protocol id')

      const address = each.token.address[each.chainId]

      if (!address || address === ethers.constants.AddressZero) throw new Error('token address not found')

      if (!aevoAddresses[each.chainId].vault || !this.contracts[each.chainId]) throw new Error('token not supported')

      const contract = IERC20__factory.connect(address, rpc[each.chainId])

      // approve if required
      const approval = await this._approveIfNeeded(
        each.wallet,
        this.contracts[each.chainId].address,
        amount,
        each.chainId,
        { contract, data: each.token }
      )

      if (approval) payload.push(approval)

      // deposit
      const tx = await this.contracts[each.chainId].populateTransaction.depositToAppChain(
        each.wallet,
        address,
        amount,
        AevoAdapterV1.AEVO_GAS_LIMIT,
        aevoAddresses[each.chainId].connector[each.token.symbol],
        '0x',
        {
          value: ethRequired
        }
      )

      payload.push({
        tx,
        ethRequired,
        desc: EMPTY_DESC,
        isUserAction: true,
        chainId: each.chainId,
        isAgentRequired: false,
        heading: AEVO_DEPOSIT_H
      })
    }

    return payload
  }

  withdraw(params: DepositWithdrawParams[]): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }

  supportedChains(opts?: ApiOpts | undefined): Chain[] {
    return [aevo]
  }

  async supportedMarkets(chains: Chain[] | undefined, opts?: ApiOpts | undefined): Promise<MarketInfo[]> {
    let marketInfo: MarketInfo[] = []

    if (chains == undefined || chains.includes(hyperliquid)) {
      const sTimeMarkets = getStaleTime(CACHE_DAY, opts)
      const allMarkets = (await this._getAllMarkets(sTimeMarkets, sTimeMarkets * CACHE_TIME_MULT, opts)).filter(
        (m) => m.is_active
      )

      allMarkets.forEach((m) => {
        const market: Market = {
          marketId: encodeMarketId(aevo.id.toString(), this.protocolId, m.underlying_asset),
          chain: aevo,
          indexToken: AEVO_TOKENS_MAP[m.underlying_asset],
          longCollateral: [AEVO_COLLATERAL_TOKEN],
          shortCollateral: [AEVO_COLLATERAL_TOKEN],
          supportedModes: {
            ISOLATED: false,
            CROSS: true
          },
          supportedOrderTypes: {
            LIMIT: true,
            MARKET: true,
            STOP_LOSS: true,
            TAKE_PROFIT: true,
            STOP_LOSS_LIMIT: true,
            TAKE_PROFIT_LIMIT: true
          },
          supportedOrderActions: {
            CREATE: true,
            UPDATE: true,
            CANCEL: true
          },
          marketSymbol: m.underlying_asset
        }

        const staticMetadata: GenericStaticMarketMetadata = {
          maxLeverage: FixedNumber.fromString(m.max_leverage!.toString()),
          minLeverage: FixedNumber.fromString('1'),
          minInitialMargin: FixedNumber.fromString('1'),
          minPositionSize: FixedNumber.fromString(m.min_order_value.toString()),
          maxPrecision: 4 // TODO - maxPrecision pending
        }

        const protocol: Protocol = {
          protocolId: 'AEVO'
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

  async getMarketPrices(marketIds: string[], opts?: ApiOpts | undefined): Promise<FixedNumber[]> {
    const sTimePrices = getStaleTime(CACHE_SECOND * 2, opts)
    const allMarkets = (await this._getAllMarkets(sTimePrices, sTimePrices, opts)).filter((m) => m.is_active)

    return marketIds.map((marketId) => {
      const market = allMarkets.find((m) => m.underlying_asset == aevoMarketIdToAsset(marketId))
      return market ? FixedNumber.fromString(market.mark_price) : ZERO_FN
    })
  }

  async getMarketsInfo(marketIds: string[], opts?: ApiOpts | undefined): Promise<MarketInfo[]> {
    let marketInfo: MarketInfo[] = []

    const supportedMarkets = await this.supportedMarkets(this.supportedChains(), opts)

    marketIds.forEach((mId) => {
      const market = supportedMarkets.find((m) => m.marketId === mId)
      if (market) {
        marketInfo.push(market)
      }
    })

    return marketInfo
  }

  async getDynamicMarketMetadata(marketIds: string[], opts?: ApiOpts | undefined): Promise<DynamicMarketMetadata[]> {
    let dynamicMarketMetadata: DynamicMarketMetadata[] = []

    const sTimeCS = getStaleTime(CACHE_SECOND * 10, opts)
    const cgStats = await this._getCoingeckoStats(sTimeCS, sTimeCS * CACHE_TIME_MULT, opts)

    marketIds.forEach((mId) => {
      const asset = aevoMarketIdToAsset(mId)
      const cgStat = cgStats.find((cg) => cg.base_currency === asset)

      if (cgStat) {
        const oiToken = FixedNumber.fromString(cgStat.open_interest!)
        const iPrice = FixedNumber.fromString(cgStat.index_price!)
        const oiUsd = oiToken.mulFN(iPrice).divFN(FixedNumber.fromString('2'))
        const fundingRate = FixedNumber.fromString(cgStat.funding_rate!)

        dynamicMarketMetadata.push({
          oiLong: oiUsd,
          oiShort: oiUsd,
          availableLiquidityLong: ZERO_FN, // TODO - availableLiquidity from OB
          availableLiquidityShort: ZERO_FN, // TODO - availableLiquidity from OB
          longFundingRate: fundingRate.mulFN(FixedNumber.fromString('-1')),
          shortFundingRate: fundingRate,
          longBorrowRate: ZERO_FN,
          shortBorrowRate: ZERO_FN
        })
      } else {
        throw new Error(`No stats found for asset ${asset}`)
      }
    })

    return dynamicMarketMetadata
  }

  increasePosition(orderData: CreateOrder[], wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }
  updateOrder(orderData: UpdateOrder[], wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }
  cancelOrder(orderData: CancelOrder[], wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }
  authenticateAgent(agentParams: AgentParams[], wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }
  closePosition(
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[],
    wallet: string,
    opts?: ApiOpts | undefined
  ): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }
  updatePositionMargin(
    positionInfo: PositionInfo[],
    updatePositionMarginData: UpdatePositionMarginData[],
    wallet: string,
    opts?: ApiOpts | undefined
  ): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }
  claimFunding(wallet: string, opts?: ApiOpts | undefined): Promise<ActionParam[]> {
    throw new Error('Method not implemented.')
  }
  getIdleMargins(wallet: string, opts?: ApiOpts | undefined): Promise<IdleMarginInfo[]> {
    throw new Error('Method not implemented.')
  }
  getAllPositions(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<PositionInfo>> {
    throw new Error('Method not implemented.')
  }
  getAllOrders(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<OrderInfo>> {
    throw new Error('Method not implemented.')
  }
  getAllOrdersForPosition(
    wallet: string,
    positionInfo: PositionInfo[],
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<Record<string, PaginatedRes<OrderInfo>>> {
    throw new Error('Method not implemented.')
  }
  getTradesHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<HistoricalTradeInfo>> {
    throw new Error('Method not implemented.')
  }
  getLiquidationHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<LiquidationInfo>> {
    throw new Error('Method not implemented.')
  }
  getClaimHistory(
    wallet: string,
    pageOptions: PageOptions | undefined,
    opts?: ApiOpts | undefined
  ): Promise<PaginatedRes<ClaimInfo>> {
    throw new Error('Method not implemented.')
  }
  getOpenTradePreview(
    wallet: string,
    orderData: CreateOrder[],
    existingPos: (PositionInfo | undefined)[],
    opts?: ApiOpts | undefined
  ): Promise<OpenTradePreviewInfo[]> {
    throw new Error('Method not implemented.')
  }
  getCloseTradePreview(
    wallet: string,
    positionInfo: PositionInfo[],
    closePositionData: ClosePositionData[],
    opts?: ApiOpts | undefined
  ): Promise<CloseTradePreviewInfo[]> {
    throw new Error('Method not implemented.')
  }
  getUpdateMarginPreview(
    wallet: string,
    isDeposit: boolean[],
    marginDelta: AmountInfo[],
    existingPos: PositionInfo[],
    opts?: ApiOpts | undefined
  ): Promise<PreviewInfo[]> {
    throw new Error('Method not implemented.')
  }
  getTotalClaimableFunding(wallet: string, opts?: ApiOpts | undefined): Promise<FixedNumber> {
    throw new Error('Method not implemented.')
  }
  getTotalAccuredFunding(wallet: string, opts?: ApiOpts | undefined): Promise<FixedNumber> {
    throw new Error('Method not implemented.')
  }
  getAccountInfo(wallet: string, opts?: ApiOpts | undefined): Promise<AccountInfo[]> {
    throw new Error('Method not implemented.')
  }
  getMarketState(wallet: string, marketIds: string[], opts?: ApiOpts | undefined): Promise<MarketState[]> {
    throw new Error('Method not implemented.')
  }
  getAgentState(wallet: string, agentParams: AgentParams[], opts?: ApiOpts | undefined): Promise<AgentState[]> {
    throw new Error('Method not implemented.')
  }
  getOrderBooks(
    marketIds: string[],
    precision: (number | undefined)[],
    opts?: ApiOpts | undefined
  ): Promise<OrderBook[]> {
    throw new Error('Method not implemented.')
  }

  /// Internal helper functions ///

  // CACHE FUNCTIONS//

  async _getAllMarkets(staleTime: number, cacheTime: number, opts?: ApiOpts) {
    const allMarkets = await cacheFetch({
      key: [AEVO_CACHE_PREFIX, 'allmarkets'],
      fn: () => this.publicApi.getMarkets(undefined, 'PERPETUAL'),
      staleTime: staleTime,
      cacheTime: cacheTime,
      opts
    })

    // aevo update tokens map
    aevoUpdateTokensMap(allMarkets)

    return allMarkets
  }

  async _getCoingeckoStats(staleTime: number, cacheTime: number, opts?: ApiOpts) {
    return await cacheFetch({
      key: [AEVO_CACHE_PREFIX, 'coingeckoStats'],
      fn: () => this.publicApi.getCoingeckoStatistics(),
      staleTime: staleTime,
      cacheTime: cacheTime
    })
  }
}
