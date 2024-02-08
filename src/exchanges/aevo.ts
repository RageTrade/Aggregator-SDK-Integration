import { Chain, formatUnits } from 'viem'
import { FixedNumber } from '../common/fixedNumber'
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
  OrderBook
} from '../interfaces/V1/IRouterAdapterBaseV1'
import { optimism, arbitrum } from 'viem/chains'
import { hyperliquid } from '../configs/hyperliquid/api/config'
import { AevoClient } from '../../generated/aevo'
import { AEVO_CACHE_PREFIX, CACHE_DAY, CACHE_MINUTE, CACHE_TIME_MULT, cacheFetch, getStaleTime } from '../common/cache'
import { aevoAddresses } from '../configs/aevo/addresses'
import { L1SocketDepositHelper, L1SocketDepositHelper__factory } from '../../typechain/aevo'
import { rpc } from '../common/provider'
import { Token, tokens } from '../common/tokens'
import { IERC20__factory } from '../../typechain/gmx-v2'
import { IERC20 } from '../../typechain/gmx-v1'
import { BigNumber, ethers } from 'ethers'
import { AEVO_DEPOSIT_H, EMPTY_DESC, getApproveTokenHeading } from '../common/buttonHeadings'
import { formatEther } from 'ethers/lib/utils'

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
    return [arbitrum]
  }

  async supportedMarkets(chains: Chain[] | undefined, opts?: ApiOpts | undefined): Promise<MarketInfo[]> {
    let marketInfo: MarketInfo[] = []

    if (chains == undefined || chains.includes(hyperliquid)) {
      const allMarkets = (await this._getAllMarkets(opts)).filter((m) => m.is_active)

      allMarkets.forEach((m) => {})
    }

    return marketInfo
  }

  getMarketPrices(marketIds: string[], opts?: ApiOpts | undefined): Promise<FixedNumber[]> {
    throw new Error('Method not implemented.')
  }
  getMarketsInfo(marketIds: string[], opts?: ApiOpts | undefined): Promise<MarketInfo[]> {
    throw new Error('Method not implemented.')
  }
  getDynamicMarketMetadata(marketIds: string[], opts?: ApiOpts | undefined): Promise<DynamicMarketMetadata[]> {
    throw new Error('Method not implemented.')
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
  async _getAllMarkets(opts?: ApiOpts) {
    const sTimeMarkets = getStaleTime(CACHE_DAY, opts)
    return await cacheFetch({
      key: [AEVO_CACHE_PREFIX, 'allmarkets'],
      fn: () => this.publicApi.getMarkets(undefined, 'PERPETUAL'),
      staleTime: sTimeMarkets,
      cacheTime: sTimeMarkets * CACHE_TIME_MULT,
      opts
    })
  }
}
