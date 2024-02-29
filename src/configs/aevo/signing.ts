import { WalletClient, getAddress, maxUint256 } from 'viem'
import AevoAdapterV1, { AEVO_REF_CODE } from '../../exchanges/aevo'
import { APICallParamsWithMetadata, RequestSignerFnWithMetadata } from '../../interfaces/IActionExecutor'
import {
  AEVO_EARN,
  AEVO_ENABLE_TRADING_H,
  AEVO_REDEEM,
  AEVO_UPDATE_LEVERAGE_H,
  AEVO_WITHDRAW_H,
  EMPTY_DESC,
  UPDATE_ORDER_H
} from '../../common/buttonHeadings'
import { AE_USD, l2Addresses } from './addresses'

const AEVO_EIP712_DOMAIN = {
  name: 'Aevo Mainnet',
  version: '1',
  chainId: 1
} as const

const REGISTER_TYPE = {
  Register: [
    { name: 'key', type: 'address' },
    { name: 'expiry', type: 'uint256' }
  ]
} as const

const SIGN_KEY_TYPE = {
  SignKey: [{ name: 'account', type: 'address' }]
} as const

const ORDER_TYPE = {
  Order: [
    { name: 'maker', type: 'address' },
    { name: 'isBuy', type: 'bool' },
    { name: 'limitPrice', type: 'uint256' },
    { name: 'amount', type: 'uint256' },
    { name: 'salt', type: 'uint256' },
    { name: 'instrument', type: 'uint256' },
    { name: 'timestamp', type: 'uint256' }
  ]
} as const

const WITHDRAW_TYPE = {
  Withdraw: [
    { name: 'collateral', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'salt', type: 'uint256' },
    { name: 'data', type: 'bytes32' }
  ]
} as const

const TRANSFER_TYPE = {
  Transfer: [
    { name: 'collateral', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'salt', type: 'uint256' }
  ]
} as const

export function signRegisterAgent(instance: AevoAdapterV1, userAddress: `0x${string}`): RequestSignerFnWithMetadata {
  return {
    fn: async (wallet: WalletClient) => {
      const key = wallet.account!.address

      const sig = await wallet.signTypedData({
        account: wallet.account!,
        domain: AEVO_EIP712_DOMAIN,
        types: SIGN_KEY_TYPE,
        primaryType: 'SignKey',
        message: { account: userAddress }
      })

      instance._setSig(key, sig)

      return undefined
    },
    chainId: 1,
    isEoaSigner: false,
    isUserAction: false,
    isAgentRequired: false,
    desc: EMPTY_DESC,
    heading: AEVO_ENABLE_TRADING_H
  }
}

export function signRegisterWallet(instance: AevoAdapterV1): RequestSignerFnWithMetadata {
  return {
    fn: async (wallet: WalletClient, agentAddress?: string) => {
      if (!agentAddress) throw new Error('agent address required')
      const data = instance._getSigKey()

      if (data.key !== agentAddress) throw new Error('agent mismatch')

      const expiry = maxUint256 - 1n

      const sig = await wallet.signTypedData({
        account: wallet.account!,
        domain: AEVO_EIP712_DOMAIN,
        types: REGISTER_TYPE,
        primaryType: 'Register',
        message: { key: agentAddress, expiry }
      })

      const args: Parameters<(typeof instance.privateApi)['postRegister']>[0] = {
        account: wallet.account!.address,
        signing_key: agentAddress,
        expiry: expiry.toString(),
        account_signature: sig,
        signing_key_signature: data.sig,
        referral_code: AEVO_REF_CODE
      }

      return instance.aevoClient.transform('postRegister', args)
    },
    chainId: 1,
    isEoaSigner: true,
    isUserAction: true,
    isAgentRequired: true,
    desc: EMPTY_DESC,
    heading: AEVO_ENABLE_TRADING_H
  }
}

type K = 1
type T = 'postOrdersOrderId'

export function signUpdateOrder(
  instance: AevoAdapterV1,
  orderId: string,
  updatedOrder: NonNullable<Parameters<AevoAdapterV1['privateApi']['postOrdersOrderId']>[1]>
): RequestSignerFnWithMetadata {
  return {
    fn: async (wallet: WalletClient) => {
      const timestamp = Math.floor(new Date().getTime() / 1000)
      // to avoid leading zeros
      const salt = BigInt(Math.floor(100000000 + Math.random() * 900000000))

      const signableOrder = {
        maker: getAddress(updatedOrder.maker),
        isBuy: updatedOrder.is_buy,
        limitPrice: BigInt(Math.round(Number(updatedOrder.limit_price))),
        amount: BigInt(Math.round(Number(updatedOrder.amount))),
        salt: salt,
        instrument: BigInt(updatedOrder.instrument),
        timestamp: BigInt(timestamp)
      } as const

      const sig = await wallet.signTypedData({
        account: wallet.account!,
        domain: AEVO_EIP712_DOMAIN,
        types: ORDER_TYPE,
        primaryType: 'Order',
        message: signableOrder
      })

      updatedOrder.signature = sig
      updatedOrder.salt = signableOrder.salt.toString()
      updatedOrder.timestamp = signableOrder.timestamp.toString()

      return instance.aevoClient.transform<T, K>('postOrdersOrderId', updatedOrder, { order: orderId })
    },
    chainId: 1,
    isEoaSigner: false,
    isUserAction: true,
    isAgentRequired: false,
    desc: EMPTY_DESC,
    heading: UPDATE_ORDER_H
  }
}

export function signCreateOrder(
  instance: AevoAdapterV1,
  order: NonNullable<Parameters<AevoAdapterV1['privateApi']['postOrders']>[0]>,
  heading: string
): RequestSignerFnWithMetadata {
  return {
    fn: async (wallet: WalletClient) => {
      const timestamp = Math.floor(new Date().getTime() / 1000)
      // to avoid leading zeros
      const salt = BigInt(Math.floor(100000000 + Math.random() * 900000000))

      const signableOrder = {
        maker: getAddress(order.maker),
        isBuy: order.is_buy,
        limitPrice: BigInt(Math.round(Number(order.limit_price))),
        amount: BigInt(Math.round(Number(order.amount))),
        salt: salt,
        instrument: BigInt(order.instrument),
        timestamp: BigInt(timestamp)
      } as const

      const sig = await wallet.signTypedData({
        account: wallet.account!,
        domain: AEVO_EIP712_DOMAIN,
        types: ORDER_TYPE,
        primaryType: 'Order',
        message: signableOrder
      })

      order.signature = sig
      order.salt = signableOrder.salt.toString()
      order.timestamp = signableOrder.timestamp.toString()

      const args: Parameters<(typeof instance.privateApi)['postOrders']>[0] = order

      return instance.aevoClient.transform('postOrders', args, undefined)
    },
    chainId: 1,
    isEoaSigner: false,
    isUserAction: true,
    isAgentRequired: false,
    desc: EMPTY_DESC,
    heading: heading
  }
}

export function updateAevoLeverage(
  instance: AevoAdapterV1,
  data: NonNullable<Parameters<AevoAdapterV1['privateApi']['postAccountLeverage']>[0]>
): APICallParamsWithMetadata {
  const params = instance.aevoClient.transform('postAccountLeverage', data, undefined)

  return {
    chainId: 1,
    apiArgs: params,
    isUserAction: false,
    desc: EMPTY_DESC,
    heading: AEVO_UPDATE_LEVERAGE_H
  }
}

export function signWithdraw(
  instance: AevoAdapterV1,
  amount: bigint,
  to: `0x${string}`,
  account: `0x${string}`,
  data: `0x${string}`,
  collateral: `0x${string}`,
  socket_fees?: bigint,
  socket_msg_gas_limit?: bigint,
  socket_connector?: `0x${string}`
): RequestSignerFnWithMetadata {
  return {
    fn: async (wallet: WalletClient) => {
      // to avoid leading zeros
      const salt = BigInt(Math.floor(100000000 + Math.random() * 900000000))

      const message = {
        to,
        data,
        salt,
        amount,
        collateral
      }

      const sig = await wallet.signTypedData({
        account: wallet.account!,
        domain: AEVO_EIP712_DOMAIN,
        types: WITHDRAW_TYPE,
        primaryType: 'Withdraw',
        message
      })

      const saltStr = message.salt.toString()
      const amountStr = message.amount.toString()
      const socketFeesStr = socket_fees?.toString() || '0'
      const gasLimitStr = socket_msg_gas_limit?.toString() || '0'

      const payload: Parameters<(typeof instance.privateApi)['postWithdraw']>[0] = {
        to: message.to,
        collateral: message.collateral,
        salt: saltStr,
        amount: amountStr,
        signature: sig,
        account,
        socket_fees: socketFeesStr,
        socket_connector,
        socket_msg_gas_limit: gasLimitStr
      }

      return instance.aevoClient.transform('postWithdraw', payload, undefined)
    },
    chainId: 1,
    isEoaSigner: true,
    isUserAction: true,
    isAgentRequired: false,
    desc: EMPTY_DESC,
    heading: AEVO_WITHDRAW_H
  }
}

export async function earnAevoUSD(instance: AevoAdapterV1, amount: bigint) {
  return {
    fn: async (wallet: WalletClient) => {
      const salt = BigInt(Math.floor(100000000 + Math.random() * 900000000))

      const message = {
        to: AE_USD,
        salt: salt,
        amount: amount,
        collateral: l2Addresses['USDC']
      }

      const sig = await wallet.signTypedData({
        account: wallet.account!,
        domain: AEVO_EIP712_DOMAIN,
        types: TRANSFER_TYPE,
        primaryType: 'Transfer',
        message
      })

      const payload: Parameters<(typeof instance.privateApi)['postTransfer']>[0] = {
        ...message,
        salt: salt.toString(),
        amount: amount.toString(),
        label: 'YV_DEPOSIT',
        signature: sig,
        account: wallet.account!.address
      }

      return instance.aevoClient.transform('postTransfer', payload, undefined)
    },
    chainId: 1,
    isEoaSigner: true,
    isUserAction: true,
    isAgentRequired: false,
    desc: EMPTY_DESC,
    heading: AEVO_EARN
  }
}

export async function redeemAevoUSD(instance: AevoAdapterV1, amount: bigint) {
  return {
    fn: async (wallet: WalletClient) => {
      const salt = BigInt(Math.floor(100000000 + Math.random() * 900000000))

      const message = {
        to: AE_USD,
        salt: salt,
        amount: amount,
        collateral: AE_USD
      }

      const sig = await wallet.signTypedData({
        account: wallet.account!,
        domain: AEVO_EIP712_DOMAIN,
        types: TRANSFER_TYPE,
        primaryType: 'Transfer',
        message
      })

      const payload: Parameters<(typeof instance.privateApi)['postTransfer']>[0] = {
        ...message,
        salt: salt.toString(),
        amount: amount.toString(),
        label: 'YV_WITHDRAW',
        signature: sig,
        account: wallet.account!.address
      }

      return instance.aevoClient.transform('postTransfer', payload, undefined)
    },
    chainId: 1,
    isEoaSigner: true,
    isUserAction: true,
    isAgentRequired: false,
    desc: EMPTY_DESC,
    heading: AEVO_REDEEM
  }
}
