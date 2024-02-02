import { ethers } from 'ethers'
import { WalletClient } from 'viem'

const HL_EIP712_DOMAIN = {
  name: 'Exchange',
  version: '1',
  chainId: 42161,
  verifyingContract: ethers.constants.AddressZero as `0x${string}`
}

const HL_L1_EIP712_DOMAIN = {
  name: 'Exchange',
  version: '1',
  chainId: 1337,
  verifyingContract: ethers.constants.AddressZero as `0x${string}`
}

const AGENT_EIP712_TYPE = {
  Agent: [
    { name: 'source', type: 'string' },
    { name: 'connectionId', type: 'bytes32' }
  ]
}

const WITHDRAW_EIP712_TYPE = {
  WithdrawFromBridge2SignPayload: [
    { name: 'destination', type: 'string' },
    { name: 'usd', type: 'string' },
    { name: 'time', type: 'uint64' }
  ]
}

const USD_TRANSFER_EIP712_TYPE = {
  UsdTransferSignPayload: [
    { name: 'destination', type: 'string' },
    { name: 'amount', type: 'string' },
    { name: 'time', type: 'uint64' }
  ]
}

export function signReadOnlyAuth(wallet: WalletClient, signatureTypes: ethers.utils.ParamType[], signatureData: any[]) {
  const phantomAgent = constructPhantomAgent(signatureTypes, signatureData, true)

  return wallet.signTypedData({
    account: wallet.account!,
    domain: HL_EIP712_DOMAIN,
    types: AGENT_EIP712_TYPE,
    primaryType: 'Agent',
    message: phantomAgent
  })
}

export function signL1Action(
  wallet: WalletClient,
  signatureTypes: ethers.utils.ParamType[],
  signatureData: any[],
  nonce: number,
  actionTypeCode?: number
) {
  signatureTypes.push(ethers.utils.ParamType.from('address'))
  signatureTypes.push(ethers.utils.ParamType.from('uint64'))

  signatureData.push(ethers.constants.AddressZero)
  signatureData.push(nonce)

  if (actionTypeCode) {
    signatureTypes.push(ethers.utils.ParamType.from('uint16'))
    signatureData.push(actionTypeCode)
  }

  const phantomAgent = constructPhantomAgent(signatureTypes, signatureData, true)

  return wallet.signTypedData({
    account: wallet.account!,
    domain: HL_L1_EIP712_DOMAIN,
    types: AGENT_EIP712_TYPE,
    primaryType: 'Agent',
    message: phantomAgent
  })
}

export function signUsdTransferAction(wallet: WalletClient, message: any) {
  return wallet.signTypedData({
    account: wallet.account!,
    domain: HL_EIP712_DOMAIN,
    types: USD_TRANSFER_EIP712_TYPE,
    primaryType: 'UsdTransferSignPayload',
    message: message
  })
}

export function signWithdrawFromBridgeAction(wallet: WalletClient, message: any) {
  return wallet.signTypedData({
    account: wallet.account!,
    domain: HL_EIP712_DOMAIN,
    types: WITHDRAW_EIP712_TYPE,
    primaryType: 'WithdrawFromBridge2SignPayload',
    message: message
  })
}

export function signAgent(wallet: WalletClient, agent: any) {
  return wallet.signTypedData({
    account: wallet.account!,
    domain: HL_EIP712_DOMAIN,
    types: AGENT_EIP712_TYPE,
    primaryType: 'Agent',
    message: agent
  })
}

function constructPhantomAgent(
  signatureTypes: ethers.utils.ParamType[],
  signatureData: any[],
  isMainnet: boolean
): any {
  const connectionId = ethers.utils.defaultAbiCoder.encode(signatureTypes, signatureData)

  return {
    source: isMainnet ? 'a' : 'b',
    connectionId: ethers.utils.solidityKeccak256(['bytes'], [connectionId])
  }
}
