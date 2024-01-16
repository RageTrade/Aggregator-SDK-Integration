import { Wallet, ethers } from 'ethers'

const HL_EIP712_DOMAIN = {
  name: 'Exchange',
  version: '1',
  chainId: 42161,
  verifyingContract: ethers.constants.AddressZero
}

const HL_L1_EIP712_DOMAIN = {
  name: 'Exchange',
  version: '1',
  chainId: 1337,
  verifyingContract: ethers.constants.AddressZero
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

export function signL1Action(
  wallet: Wallet,
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

  return wallet._signTypedData(HL_L1_EIP712_DOMAIN, AGENT_EIP712_TYPE, phantomAgent)
}

export function signUsdTransferAction(wallet: Wallet, message: any) {
  return wallet._signTypedData(HL_EIP712_DOMAIN, USD_TRANSFER_EIP712_TYPE, message)
}

export function signWithdrawFromBridgeAction(wallet: Wallet, message: any) {
  return wallet._signTypedData(HL_EIP712_DOMAIN, WITHDRAW_EIP712_TYPE, message)
}

export function signAgent(wallet: Wallet, agent: any) {
  return wallet._signTypedData(HL_EIP712_DOMAIN, AGENT_EIP712_TYPE, agent)
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
