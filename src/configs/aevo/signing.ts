import { WalletClient, maxUint256 } from 'viem'
import AevoAdapterV1, { AEVO_REF_CODE } from '../../exchanges/aevo'
import { RequestSignerFnWithMetadata } from '../../interfaces/IActionExecutor'
import { AEVO_REGISTER_H, AEVO_SET_REF_H, EMPTY_DESC } from '../../common/buttonHeadings'

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
    heading: AEVO_REGISTER_H
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
    heading: AEVO_SET_REF_H
  }
}
