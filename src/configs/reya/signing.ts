import type { ConditionalOrderType, MarketEntity } from '@reyaxyz/api-sdk'
import { ApiClient } from '@reyaxyz/api-sdk'
import type { Address } from '@reyaxyz/common'
import {
  ApprovalType,
  approveTokenSpending,
  bridgeAndDepositExistingMA,
  getAllowance,
  grantTradePermission,
  matchOrder,
  withdrawMAAndBridge
} from '@reyaxyz/sdk'
import { joinSignature } from 'ethers/lib/utils'
import type {
  BlockTag,
  BytesLike,
  Provider,
  Signer,
  TransactionLike,
  TransactionRequest,
  TransactionResponse
} from 'ethers-v6'
import { ethers } from 'ethers-v6'
import type { WalletClient } from 'viem'
import type { blast } from 'viem/chains'
import { arbitrum, optimism } from 'viem/chains'

import { EMPTY_DESC, REYA_DEPOSIT, REYA_TRADE, REYA_WITHDRAW } from '../../common/buttonHeadings'
import type { Maybe } from '../../common/tokens'
import type { RequestSignerFnWithMetadata } from '../../interfaces'

export function signWithdraw(
  moneyInOutChainId: number,
  marginAccountId: number,
  owner: { address: Address },
  amount: number,
  tokenAddress: {
    [arbitrum.id]: Maybe<`0x${string}`>
    [optimism.id]: Maybe<`0x${string}`>
    [blast.id]: Maybe<`0x${string}`>
  }
): RequestSignerFnWithMetadata {
  return {
    fn: async (wallet: WalletClient) => {
      const signer: Signer = new ViemSigner(wallet) as Signer
      const token = tokenAddress[moneyInOutChainId === arbitrum.id ? arbitrum.id : optimism.id] as Lowercase<string>

      const accountOwner = await ApiClient.owner.getOwnerMetadata({
        ownerAddress: owner.address
      })
      await withdrawMAAndBridge({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        signer: signer as Signer,
        moneyInOutChainId,
        marginAccountId,
        owner: {
          address: owner.address,
          coreSigNonce: accountOwner.coreSigNonce
        },
        amount,
        tokenAddress: token
      })
      return undefined
    },
    chainId: 1,
    isEoaSigner: true,
    isUserAction: true,
    isAgentRequired: false,
    desc: EMPTY_DESC,
    heading: REYA_WITHDRAW
  }
}

export function signApproveAndDeposit(
  chainId: number,
  marginAccountId: number,
  amount: number,
  tokenAddress: {
    [arbitrum.id]: Maybe<`0x${string}`>
    [optimism.id]: Maybe<`0x${string}`>
    [blast.id]: Maybe<`0x${string}`>
  }
): RequestSignerFnWithMetadata {
  return {
    fn: async (wallet: WalletClient) => {
      const provider = ethers.getDefaultProvider(
        chainId === optimism.id ? 'https://mainnet.optimism.io' : 'https://arb1.arbitrum.io/rpc'
      )
      const signer: Signer = new ViemSigner(wallet, provider) as Signer
      const token = tokenAddress[chainId === arbitrum.id ? arbitrum.id : optimism.id] as Lowercase<string>
      const tokenAllowance = await getAllowance({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        signer: signer as Signer,
        tokenAddress: token,
        type: ApprovalType.BRIDGE
      })

      if (tokenAllowance < amount) {
        // approve token spending
        await approveTokenSpending({
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          signer: signer as Signer,
          tokenAddress: token,
          amount: amount,
          type: ApprovalType.BRIDGE
        })
      }

      await ApiClient.depositExistingMASimulation.arm({
        marginAccountId
      })

      const simulation = ApiClient.depositExistingMASimulation.simulate({
        moneyInOutChainId: chainId,
        amount: amount,
        tokenAddress: token
      })

      await bridgeAndDepositExistingMA({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        signer: signer as Signer,
        marginAccountId,
        amount,
        tokenAddress: token,
        socketDepositFees: simulation.socketDepositFees.fees
      })
      return undefined
    },
    chainId: 1,
    isEoaSigner: true,
    isUserAction: true,
    isAgentRequired: false,
    desc: EMPTY_DESC,
    heading: REYA_DEPOSIT
  }
}

export function signOrder(
  marginAccountId: number,
  amountInBase: number,
  market: MarketEntity
): RequestSignerFnWithMetadata {
  return {
    fn: async (wallet: WalletClient) => {
      const signer: Signer = new ViemSigner(wallet) as Signer

      const owner = await ApiClient.owner.getOwnerMetadata({
        ownerAddress: wallet.account!.address
      })
      await matchOrder({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        signer: signer as Signer,
        amountInBase: amountInBase,
        marginAccountId,
        owner: {
          coreSigNonce: owner.coreSigNonce
        },
        market: {
          id: market.id,
          exchangeId: market.orderInfo.exchangeId,
          counterpartyAccountIds: market.orderInfo.counterpartyAccountIds,
          currentPrice: market.markPrice,
          minOrderSizeBase: market.minOrderSizeBase,
          baseSpacing: market.baseSpacing
        }
      })
      return undefined
    },
    chainId: 1,
    isEoaSigner: true,
    isUserAction: true,
    isAgentRequired: false,
    desc: EMPTY_DESC,
    heading: REYA_TRADE
  }
}

export function signTriggerOrder(
  marginAccountId: number,
  amountInBase: number,
  triggerPrice: number,
  orderType: ConditionalOrderType,
  market: MarketEntity
): RequestSignerFnWithMetadata {
  return {
    fn: async (wallet: WalletClient) => {
      const signer: Signer = new ViemSigner(wallet) as Signer

      const hasPermission = await ApiClient.conditionalOrders.alreadyGaveTradePermissions({
        accountId: marginAccountId
      })

      if (!hasPermission) {
        const owner = await ApiClient.owner.getOwnerMetadata({
          ownerAddress: wallet.account!.address
        })
        await grantTradePermission({
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          signer: signer,
          owner: {
            coreSigNonce: owner.coreSigNonce
          },
          accountId: marginAccountId
        })
      }

      await ApiClient.conditionalOrders.registerConditionalOrder({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        signer: signer as Signer,
        marginAccountId,
        triggerPrice: triggerPrice,
        orderType: orderType,
        marketId: market.id,
        supportingParams: {
          exchangeId: market.orderInfo.exchangeId,
          counterpartyAccountIds: market.orderInfo.counterpartyAccountIds,
          currentPrice: market.markPrice
        },
        amountInBase: amountInBase
      })
      return undefined
    },
    chainId: 1,
    isEoaSigner: true,
    isUserAction: true,
    isAgentRequired: false,
    desc: EMPTY_DESC,
    heading: REYA_TRADE
  }
}

export function signCancelOrder(orderId: string): RequestSignerFnWithMetadata {
  return {
    fn: async (wallet: WalletClient) => {
      const signer: Signer = new ViemSigner(wallet) as Signer
      await ApiClient.conditionalOrders.cancelConditionalOrder({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        signer: signer as Signer,
        orderId: orderId
      })
      return undefined
    },
    chainId: 1,
    isEoaSigner: true,
    isUserAction: true,
    isAgentRequired: false,
    desc: EMPTY_DESC,
    heading: REYA_TRADE
  }
}

export function signUpdateOrder(
  orderId: string,
  marginAccountId: number,
  amountInBase: number,
  triggerPrice: number,
  orderType: ConditionalOrderType,
  market: MarketEntity
): RequestSignerFnWithMetadata {
  return {
    fn: async (wallet: WalletClient) => {
      const signer: Signer = new ViemSigner(wallet) as Signer
      await ApiClient.conditionalOrders.updateConditionalOrder({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        signer: signer as Signer,
        marginAccountId,
        triggerPrice: triggerPrice,
        orderType: orderType,
        marketId: market.id,
        supportingParams: {
          exchangeId: market.orderInfo.exchangeId,
          counterpartyAccountIds: market.orderInfo.counterpartyAccountIds,
          currentPrice: market.markPrice
        },
        amountInBase: amountInBase,
        cancelOrderId: orderId
      })
      return undefined
    },
    chainId: 1,
    isEoaSigner: true,
    isUserAction: true,
    isAgentRequired: false,
    desc: EMPTY_DESC,
    heading: REYA_TRADE
  }
}

function adaptToViemTransaction(tx: TransactionRequest): any {
  return {
    to: tx.to as `0x${string}` | null,
    data: tx.data as `0x${string}`,
    type: 'eip1559',
    gas: tx.gasLimit ? BigInt(tx.gasLimit.toString()) : undefined,
    nonce: tx.nonce,
    value: tx.value ? BigInt(tx.value.toString()) : undefined,
    maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas.toString()) : undefined,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? BigInt(tx.maxPriorityFeePerGas.toString()) : undefined
  }
}

export class ViemSigner implements Signer {
  private walletClient: WalletClient
  public provider: Provider | null

  constructor(walletClient: WalletClient, provider?: Provider) {
    this.walletClient = walletClient
    this.provider = provider || null
  }

  // Implement getAddress method
  async getAddress(): Promise<string> {
    // Assuming walletClient has a method to get the address
    return this.walletClient.account!.address
  }

  // Implement signMessage method
  async signMessage(message: BytesLike): Promise<string> {
    if (!this.walletClient.account) {
      throw new Error('Account is not set in the wallet client.')
    }
    const signature = await this.walletClient.signMessage({
      account: this.walletClient.account!,
      message: message as string
    })

    // Return the signature as a string
    return joinSignature(signature)
  }

  // Implement signTransaction method
  async signTransaction(transaction: TransactionRequest): Promise<string> {
    throw new Error('Method not implemented.')
  }

  // Implement connect method
  connect(provider: Provider): ViemSigner {
    return new ViemSigner(this.walletClient, provider)
  }

  async sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse> {
    if (!this.provider) {
      throw new Error('Provider is not set')
    }
    const adaptedTransaction = adaptToViemTransaction(transaction)
    const tx = await this.walletClient.sendTransaction(adaptedTransaction)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return {
      hash: tx,
      wait: async (confirmations?: number) => {
        return this.provider!.waitForTransaction(tx, confirmations)
      }
    }
  }

  // Additional method to sign typed data (EIP-712)
  async signTypedData(domain: any, types: Record<string, any>, value: Record<string, any>): Promise<string> {
    const signature = await this.walletClient.signTypedData({
      account: this.walletClient.account!,
      domain,
      types,
      message: value,
      primaryType: Object.keys(types)[0] // executeBySig etc
    })
    return joinSignature(signature)
  }
  async estimateGas(tx: TransactionRequest): Promise<bigint> {
    if (!this.provider) {
      throw new Error('Provider is not set')
    }
    // Adapt the transaction request if necessary
    const adaptedTx = adaptToViemTransaction(tx)
    delete adaptedTx.type

    // Estimate gas using the provider
    const estimatedGas = await this.provider.estimateGas({
      ...adaptedTx,
      from: this.walletClient.account!.address
    })
    return BigInt(estimatedGas)
  }

  getNonce(blockTag?: BlockTag): Promise<number> {
    throw new Error('Method not implemented.')
  }
  _legacySignMessage(message: BytesLike): Promise<string> {
    throw new Error('Method not implemented.')
  }

  populateTransaction(tx: TransactionRequest): Promise<TransactionLike<string>> {
    throw new Error('Method not implemented.')
  }

  populateCall(tx: TransactionRequest): Promise<TransactionLike<string>> {
    throw new Error('Method not implemented.')
  }
  call(tx: TransactionRequest): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider is not set')
    }
    return this.provider.call(tx)
  }
  resolveName(name: string): Promise<string> {
    throw new Error('Method not implemented.')
  }
}
