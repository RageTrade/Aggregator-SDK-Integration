import { AssetMetadata, QuoteCurrency, SupportedAsset, fetchMarketSnapshots2, modifyPosition } from 'perennial-sdk-ts'
import { Market, Network, Provider, UnsignedTxWithMetadata } from '../interface'
import { CreateOrder, MarketInfo } from '../interfaces/V1/IRouterAdapterBaseV1'
import { http, createPublicClient, Address, PublicClient, zeroAddress } from 'viem'

import { arbitrum } from 'viem/chains'
import { tokens } from '../common/tokens'
import { FixedNumber } from 'ethers-v6'

export default class PerennialV2Service {
  // Create Public Client
  publicClient = createPublicClient({
    chain: arbitrum,
    transport: http(arbitrum.rpcUrls.public.http[0], {
      batch: true
    })
  })

  constructor() {}

  // something to indicate when setup should be called
  async setup(provider: Provider): Promise<UnsignedTxWithMetadata[]> {
    return []
  }

  supportedNetworks(): Network[] {
    const networks: Network[] = []
    networks.push({
      name: 'arbitrum',
      chainId: 42161
    })
    return networks
  }

  private getToken(perennialAsset: string) {
    const assetMetadata = tokens
    if (perennialAsset === SupportedAsset.btc) return tokens.BTC
    else if (perennialAsset === SupportedAsset.eth) return tokens.ETH
    else if (perennialAsset === SupportedAsset.sol) return tokens.SOL
    else if (perennialAsset === SupportedAsset.matic) return tokens.MATIC
    else if (perennialAsset === QuoteCurrency.usd) return tokens['USDC.e']
    else throw new Error('Asset not supported')
  }

  async supportedMarkets(networks: Network[] | undefined) {
    const snapshot = await fetchMarketSnapshots2(this.publicClient)
    if (!snapshot) throw new Error('No snapshot found')
    const marketKeys = Object.keys(snapshot.market)
    const marketInfoList: Partial<MarketInfo>[] = []
    for (const key of marketKeys) {
      const value = snapshot.market[key as keyof typeof snapshot.market]
      const assetMetadata = AssetMetadata[value.asset]
      marketInfoList.push({
        marketId: `${arbitrum.id}-PERV2-${value.market}`,
        protocolId: 'PERV2',
        protocolMarketId: value.market,
        indexToken: this.getToken(value.asset),
        longCollateral: [this.getToken(assetMetadata.quoteCurrency)],
        shortCollateral: [this.getToken(assetMetadata.quoteCurrency)],
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
        data: {
          minLeverage: FixedNumber.fromString('0', 30),
          maxLeverage: FixedNumber.fromString((1000000 / Number(value.riskParameter.margin)).toString(), 30),
          minInitialMargin: { amount: FixedNumber.fromString('10', 6), isTokenAmount: false },
          minPositionSize: { amount: FixedNumber.fromString('0', 6), isTokenAmount: false }
        }
      })
    }

    return marketInfoList
  }

  createOrder(
    marketId: String, // Global id
    order: CreateOrder
  ): Promise<UnsignedTxWithMetadata[]> {
    // await modifyPosition(this.publicClient,)
    return Promise.resolve([])
  }

  async getModifyTransaction(marketId: String, order: CreateOrder): Promise<UnsignedTxWithMetadata[]> {
    return Promise.resolve([])
  }
}
