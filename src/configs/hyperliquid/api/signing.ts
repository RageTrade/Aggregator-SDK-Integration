import { TypedDataDomain, TypedDataField, Wallet, ethers } from 'ethers';

type EIP712Data = {
  domain: TypedDataDomain;
  types: Record<string, Array<TypedDataField>>;
  primaryType: string;
  message: Record<string, any>;
};

export function signL1Action(
  wallet: Wallet,
  signatureTypes: ethers.utils.ParamType[],
  signatureData: any[],
  activePool: string | undefined,
  nonce: number,
  isMainnet: boolean,
  actionTypeCode?: number
) {
  signatureTypes.push(ethers.utils.ParamType.from('address'));
  signatureTypes.push(ethers.utils.ParamType.from('uint64'));

  activePool ? signatureData.push(activePool) : signatureData.push(ethers.constants.AddressZero);
  signatureData.push(nonce);

  if (actionTypeCode !== undefined) {
    signatureTypes.push(ethers.utils.ParamType.from('uint16'));
    signatureData.push(actionTypeCode);
  }

  const phantomAgent = constructPhantomAgent(signatureTypes, signatureData, isMainnet);

  const data = {
    domain: {
      chainId: 1337,
      name: 'Exchange',
      verifyingContract: ethers.constants.AddressZero,
      version: '1',
    },
    types: {
      Agent: [
        { name: 'source', type: 'string' },
        { name: 'connectionId', type: 'bytes32' },
      ],
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
    },
    primaryType: 'Agent',
    message: phantomAgent,
  };

  return signInner(wallet, data);
}

export function signUsdTransferAction(wallet: Wallet, message: any, isMainnet: boolean) {
  const data = {
    domain: {
      name: 'Exchange',
      version: '1',
      chainId: isMainnet ? 42161 : 421614,
      verifyingContract: ethers.constants.AddressZero,
    },
    types: {
      UsdTransferSignPayload: [
        { name: 'destination', type: 'string' },
        { name: 'amount', type: 'string' },
        { name: 'time', type: 'uint64' },
      ],
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
    },
    primaryType: 'UsdTransferSignPayload',
    message,
  };

  return signInner(wallet, data);
}

export function signWithdrawFromBridgeAction(wallet: Wallet, message: any, isMainnet: boolean) {
  const domain = {
    name: 'Exchange',
    version: '1',
    chainId: isMainnet ? 42161 : 421614,
    verifyingContract: ethers.constants.AddressZero,
  }

  const types = {
    WithdrawFromBridge2SignPayload: [
      { name: 'destination', type: 'string' },
      { name: 'usd', type: 'string' },
      { name: 'time', type: 'uint64' },
    ],
  }

  return wallet._signTypedData(domain, types, message);
}

export function signAgent(wallet: Wallet, agent: any, isMainnet: boolean) {
  const data = {
    domain: {
      name: 'Exchange',
      version: '1',
      chainId: isMainnet ? 42161 : 421614,
      verifyingContract: ethers.constants.AddressZero,
    },
    types: {
      Agent: [
        { name: 'source', type: 'string' },
        { name: 'connectionId', type: 'bytes32' },
      ],
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
    },
    primaryType: 'Agent',
    message: agent,
  };

  return signInner(wallet, data);
}

function signInner(wallet: Wallet, data: EIP712Data) {
  return wallet._signTypedData(data.domain, data.types, data.message);
}

function constructPhantomAgent(signatureTypes: ethers.utils.ParamType[], signatureData: any[], isMainnet: boolean): any {
  const connectionId = ethers.utils.defaultAbiCoder.encode(signatureTypes, signatureData);

  return {
    source: isMainnet ? 'a' : 'b',
    connectionId: ethers.utils.solidityKeccak256(["string"], [connectionId]),
  };
}
