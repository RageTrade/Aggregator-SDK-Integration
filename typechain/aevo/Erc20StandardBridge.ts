/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PayableOverrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import type {
  FunctionFragment,
  Result,
  EventFragment,
} from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
} from "./common";

export interface Erc20StandardBridgeInterface extends utils.Interface {
  functions: {
    "MESSENGER()": FunctionFragment;
    "OTHER_BRIDGE()": FunctionFragment;
    "bridgeERC20(address,address,uint256,uint32,bytes)": FunctionFragment;
    "bridgeERC20To(address,address,address,uint256,uint32,bytes)": FunctionFragment;
    "bridgeETH(uint32,bytes)": FunctionFragment;
    "bridgeETHTo(address,uint32,bytes)": FunctionFragment;
    "depositERC20(address,address,uint256,uint32,bytes)": FunctionFragment;
    "depositERC20To(address,address,address,uint256,uint32,bytes)": FunctionFragment;
    "depositETH(uint32,bytes)": FunctionFragment;
    "depositETHTo(address,uint32,bytes)": FunctionFragment;
    "deposits(address,address)": FunctionFragment;
    "finalizeBridgeERC20(address,address,address,address,uint256,bytes)": FunctionFragment;
    "finalizeBridgeETH(address,address,uint256,bytes)": FunctionFragment;
    "finalizeERC20Withdrawal(address,address,address,address,uint256,bytes)": FunctionFragment;
    "finalizeETHWithdrawal(address,address,uint256,bytes)": FunctionFragment;
    "l2TokenBridge()": FunctionFragment;
    "messenger()": FunctionFragment;
    "version()": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "MESSENGER"
      | "OTHER_BRIDGE"
      | "bridgeERC20"
      | "bridgeERC20To"
      | "bridgeETH"
      | "bridgeETHTo"
      | "depositERC20"
      | "depositERC20To"
      | "depositETH"
      | "depositETHTo"
      | "deposits"
      | "finalizeBridgeERC20"
      | "finalizeBridgeETH"
      | "finalizeERC20Withdrawal"
      | "finalizeETHWithdrawal"
      | "l2TokenBridge"
      | "messenger"
      | "version"
  ): FunctionFragment;

  encodeFunctionData(functionFragment: "MESSENGER", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "OTHER_BRIDGE",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "bridgeERC20",
    values: [string, string, BigNumberish, BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "bridgeERC20To",
    values: [string, string, string, BigNumberish, BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "bridgeETH",
    values: [BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "bridgeETHTo",
    values: [string, BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "depositERC20",
    values: [string, string, BigNumberish, BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "depositERC20To",
    values: [string, string, string, BigNumberish, BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "depositETH",
    values: [BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "depositETHTo",
    values: [string, BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "deposits",
    values: [string, string]
  ): string;
  encodeFunctionData(
    functionFragment: "finalizeBridgeERC20",
    values: [string, string, string, string, BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "finalizeBridgeETH",
    values: [string, string, BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "finalizeERC20Withdrawal",
    values: [string, string, string, string, BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "finalizeETHWithdrawal",
    values: [string, string, BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "l2TokenBridge",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "messenger", values?: undefined): string;
  encodeFunctionData(functionFragment: "version", values?: undefined): string;

  decodeFunctionResult(functionFragment: "MESSENGER", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "OTHER_BRIDGE",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "bridgeERC20",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "bridgeERC20To",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "bridgeETH", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "bridgeETHTo",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "depositERC20",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "depositERC20To",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "depositETH", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "depositETHTo",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "deposits", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "finalizeBridgeERC20",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "finalizeBridgeETH",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "finalizeERC20Withdrawal",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "finalizeETHWithdrawal",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "l2TokenBridge",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "messenger", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "version", data: BytesLike): Result;

  events: {
    "ERC20BridgeFinalized(address,address,address,address,uint256,bytes)": EventFragment;
    "ERC20BridgeInitiated(address,address,address,address,uint256,bytes)": EventFragment;
    "ERC20DepositInitiated(address,address,address,address,uint256,bytes)": EventFragment;
    "ERC20WithdrawalFinalized(address,address,address,address,uint256,bytes)": EventFragment;
    "ETHBridgeFinalized(address,address,uint256,bytes)": EventFragment;
    "ETHBridgeInitiated(address,address,uint256,bytes)": EventFragment;
    "ETHDepositInitiated(address,address,uint256,bytes)": EventFragment;
    "ETHWithdrawalFinalized(address,address,uint256,bytes)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "ERC20BridgeFinalized"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "ERC20BridgeInitiated"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "ERC20DepositInitiated"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "ERC20WithdrawalFinalized"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "ETHBridgeFinalized"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "ETHBridgeInitiated"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "ETHDepositInitiated"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "ETHWithdrawalFinalized"): EventFragment;
}

export interface ERC20BridgeFinalizedEventObject {
  localToken: string;
  remoteToken: string;
  from: string;
  to: string;
  amount: BigNumber;
  extraData: string;
}
export type ERC20BridgeFinalizedEvent = TypedEvent<
  [string, string, string, string, BigNumber, string],
  ERC20BridgeFinalizedEventObject
>;

export type ERC20BridgeFinalizedEventFilter =
  TypedEventFilter<ERC20BridgeFinalizedEvent>;

export interface ERC20BridgeInitiatedEventObject {
  localToken: string;
  remoteToken: string;
  from: string;
  to: string;
  amount: BigNumber;
  extraData: string;
}
export type ERC20BridgeInitiatedEvent = TypedEvent<
  [string, string, string, string, BigNumber, string],
  ERC20BridgeInitiatedEventObject
>;

export type ERC20BridgeInitiatedEventFilter =
  TypedEventFilter<ERC20BridgeInitiatedEvent>;

export interface ERC20DepositInitiatedEventObject {
  l1Token: string;
  l2Token: string;
  from: string;
  to: string;
  amount: BigNumber;
  extraData: string;
}
export type ERC20DepositInitiatedEvent = TypedEvent<
  [string, string, string, string, BigNumber, string],
  ERC20DepositInitiatedEventObject
>;

export type ERC20DepositInitiatedEventFilter =
  TypedEventFilter<ERC20DepositInitiatedEvent>;

export interface ERC20WithdrawalFinalizedEventObject {
  l1Token: string;
  l2Token: string;
  from: string;
  to: string;
  amount: BigNumber;
  extraData: string;
}
export type ERC20WithdrawalFinalizedEvent = TypedEvent<
  [string, string, string, string, BigNumber, string],
  ERC20WithdrawalFinalizedEventObject
>;

export type ERC20WithdrawalFinalizedEventFilter =
  TypedEventFilter<ERC20WithdrawalFinalizedEvent>;

export interface ETHBridgeFinalizedEventObject {
  from: string;
  to: string;
  amount: BigNumber;
  extraData: string;
}
export type ETHBridgeFinalizedEvent = TypedEvent<
  [string, string, BigNumber, string],
  ETHBridgeFinalizedEventObject
>;

export type ETHBridgeFinalizedEventFilter =
  TypedEventFilter<ETHBridgeFinalizedEvent>;

export interface ETHBridgeInitiatedEventObject {
  from: string;
  to: string;
  amount: BigNumber;
  extraData: string;
}
export type ETHBridgeInitiatedEvent = TypedEvent<
  [string, string, BigNumber, string],
  ETHBridgeInitiatedEventObject
>;

export type ETHBridgeInitiatedEventFilter =
  TypedEventFilter<ETHBridgeInitiatedEvent>;

export interface ETHDepositInitiatedEventObject {
  from: string;
  to: string;
  amount: BigNumber;
  extraData: string;
}
export type ETHDepositInitiatedEvent = TypedEvent<
  [string, string, BigNumber, string],
  ETHDepositInitiatedEventObject
>;

export type ETHDepositInitiatedEventFilter =
  TypedEventFilter<ETHDepositInitiatedEvent>;

export interface ETHWithdrawalFinalizedEventObject {
  from: string;
  to: string;
  amount: BigNumber;
  extraData: string;
}
export type ETHWithdrawalFinalizedEvent = TypedEvent<
  [string, string, BigNumber, string],
  ETHWithdrawalFinalizedEventObject
>;

export type ETHWithdrawalFinalizedEventFilter =
  TypedEventFilter<ETHWithdrawalFinalizedEvent>;

export interface Erc20StandardBridge extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: Erc20StandardBridgeInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    MESSENGER(overrides?: CallOverrides): Promise<[string]>;

    OTHER_BRIDGE(overrides?: CallOverrides): Promise<[string]>;

    bridgeERC20(
      _localToken: string,
      _remoteToken: string,
      _amount: BigNumberish,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    bridgeERC20To(
      _localToken: string,
      _remoteToken: string,
      _to: string,
      _amount: BigNumberish,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    bridgeETH(
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<ContractTransaction>;

    bridgeETHTo(
      _to: string,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<ContractTransaction>;

    depositERC20(
      _l1Token: string,
      _l2Token: string,
      _amount: BigNumberish,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    depositERC20To(
      _l1Token: string,
      _l2Token: string,
      _to: string,
      _amount: BigNumberish,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    depositETH(
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<ContractTransaction>;

    depositETHTo(
      _to: string,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<ContractTransaction>;

    deposits(
      arg0: string,
      arg1: string,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    finalizeBridgeERC20(
      _localToken: string,
      _remoteToken: string,
      _from: string,
      _to: string,
      _amount: BigNumberish,
      _extraData: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    finalizeBridgeETH(
      _from: string,
      _to: string,
      _amount: BigNumberish,
      _extraData: BytesLike,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<ContractTransaction>;

    finalizeERC20Withdrawal(
      _l1Token: string,
      _l2Token: string,
      _from: string,
      _to: string,
      _amount: BigNumberish,
      _extraData: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    finalizeETHWithdrawal(
      _from: string,
      _to: string,
      _amount: BigNumberish,
      _extraData: BytesLike,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<ContractTransaction>;

    l2TokenBridge(overrides?: CallOverrides): Promise<[string]>;

    messenger(overrides?: CallOverrides): Promise<[string]>;

    version(overrides?: CallOverrides): Promise<[string]>;
  };

  MESSENGER(overrides?: CallOverrides): Promise<string>;

  OTHER_BRIDGE(overrides?: CallOverrides): Promise<string>;

  bridgeERC20(
    _localToken: string,
    _remoteToken: string,
    _amount: BigNumberish,
    _minGasLimit: BigNumberish,
    _extraData: BytesLike,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  bridgeERC20To(
    _localToken: string,
    _remoteToken: string,
    _to: string,
    _amount: BigNumberish,
    _minGasLimit: BigNumberish,
    _extraData: BytesLike,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  bridgeETH(
    _minGasLimit: BigNumberish,
    _extraData: BytesLike,
    overrides?: PayableOverrides & { from?: string }
  ): Promise<ContractTransaction>;

  bridgeETHTo(
    _to: string,
    _minGasLimit: BigNumberish,
    _extraData: BytesLike,
    overrides?: PayableOverrides & { from?: string }
  ): Promise<ContractTransaction>;

  depositERC20(
    _l1Token: string,
    _l2Token: string,
    _amount: BigNumberish,
    _minGasLimit: BigNumberish,
    _extraData: BytesLike,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  depositERC20To(
    _l1Token: string,
    _l2Token: string,
    _to: string,
    _amount: BigNumberish,
    _minGasLimit: BigNumberish,
    _extraData: BytesLike,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  depositETH(
    _minGasLimit: BigNumberish,
    _extraData: BytesLike,
    overrides?: PayableOverrides & { from?: string }
  ): Promise<ContractTransaction>;

  depositETHTo(
    _to: string,
    _minGasLimit: BigNumberish,
    _extraData: BytesLike,
    overrides?: PayableOverrides & { from?: string }
  ): Promise<ContractTransaction>;

  deposits(
    arg0: string,
    arg1: string,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  finalizeBridgeERC20(
    _localToken: string,
    _remoteToken: string,
    _from: string,
    _to: string,
    _amount: BigNumberish,
    _extraData: BytesLike,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  finalizeBridgeETH(
    _from: string,
    _to: string,
    _amount: BigNumberish,
    _extraData: BytesLike,
    overrides?: PayableOverrides & { from?: string }
  ): Promise<ContractTransaction>;

  finalizeERC20Withdrawal(
    _l1Token: string,
    _l2Token: string,
    _from: string,
    _to: string,
    _amount: BigNumberish,
    _extraData: BytesLike,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  finalizeETHWithdrawal(
    _from: string,
    _to: string,
    _amount: BigNumberish,
    _extraData: BytesLike,
    overrides?: PayableOverrides & { from?: string }
  ): Promise<ContractTransaction>;

  l2TokenBridge(overrides?: CallOverrides): Promise<string>;

  messenger(overrides?: CallOverrides): Promise<string>;

  version(overrides?: CallOverrides): Promise<string>;

  callStatic: {
    MESSENGER(overrides?: CallOverrides): Promise<string>;

    OTHER_BRIDGE(overrides?: CallOverrides): Promise<string>;

    bridgeERC20(
      _localToken: string,
      _remoteToken: string,
      _amount: BigNumberish,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    bridgeERC20To(
      _localToken: string,
      _remoteToken: string,
      _to: string,
      _amount: BigNumberish,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    bridgeETH(
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    bridgeETHTo(
      _to: string,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    depositERC20(
      _l1Token: string,
      _l2Token: string,
      _amount: BigNumberish,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    depositERC20To(
      _l1Token: string,
      _l2Token: string,
      _to: string,
      _amount: BigNumberish,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    depositETH(
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    depositETHTo(
      _to: string,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    deposits(
      arg0: string,
      arg1: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    finalizeBridgeERC20(
      _localToken: string,
      _remoteToken: string,
      _from: string,
      _to: string,
      _amount: BigNumberish,
      _extraData: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    finalizeBridgeETH(
      _from: string,
      _to: string,
      _amount: BigNumberish,
      _extraData: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    finalizeERC20Withdrawal(
      _l1Token: string,
      _l2Token: string,
      _from: string,
      _to: string,
      _amount: BigNumberish,
      _extraData: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    finalizeETHWithdrawal(
      _from: string,
      _to: string,
      _amount: BigNumberish,
      _extraData: BytesLike,
      overrides?: CallOverrides
    ): Promise<void>;

    l2TokenBridge(overrides?: CallOverrides): Promise<string>;

    messenger(overrides?: CallOverrides): Promise<string>;

    version(overrides?: CallOverrides): Promise<string>;
  };

  filters: {
    "ERC20BridgeFinalized(address,address,address,address,uint256,bytes)"(
      localToken?: string | null,
      remoteToken?: string | null,
      from?: string | null,
      to?: null,
      amount?: null,
      extraData?: null
    ): ERC20BridgeFinalizedEventFilter;
    ERC20BridgeFinalized(
      localToken?: string | null,
      remoteToken?: string | null,
      from?: string | null,
      to?: null,
      amount?: null,
      extraData?: null
    ): ERC20BridgeFinalizedEventFilter;

    "ERC20BridgeInitiated(address,address,address,address,uint256,bytes)"(
      localToken?: string | null,
      remoteToken?: string | null,
      from?: string | null,
      to?: null,
      amount?: null,
      extraData?: null
    ): ERC20BridgeInitiatedEventFilter;
    ERC20BridgeInitiated(
      localToken?: string | null,
      remoteToken?: string | null,
      from?: string | null,
      to?: null,
      amount?: null,
      extraData?: null
    ): ERC20BridgeInitiatedEventFilter;

    "ERC20DepositInitiated(address,address,address,address,uint256,bytes)"(
      l1Token?: string | null,
      l2Token?: string | null,
      from?: string | null,
      to?: null,
      amount?: null,
      extraData?: null
    ): ERC20DepositInitiatedEventFilter;
    ERC20DepositInitiated(
      l1Token?: string | null,
      l2Token?: string | null,
      from?: string | null,
      to?: null,
      amount?: null,
      extraData?: null
    ): ERC20DepositInitiatedEventFilter;

    "ERC20WithdrawalFinalized(address,address,address,address,uint256,bytes)"(
      l1Token?: string | null,
      l2Token?: string | null,
      from?: string | null,
      to?: null,
      amount?: null,
      extraData?: null
    ): ERC20WithdrawalFinalizedEventFilter;
    ERC20WithdrawalFinalized(
      l1Token?: string | null,
      l2Token?: string | null,
      from?: string | null,
      to?: null,
      amount?: null,
      extraData?: null
    ): ERC20WithdrawalFinalizedEventFilter;

    "ETHBridgeFinalized(address,address,uint256,bytes)"(
      from?: string | null,
      to?: string | null,
      amount?: null,
      extraData?: null
    ): ETHBridgeFinalizedEventFilter;
    ETHBridgeFinalized(
      from?: string | null,
      to?: string | null,
      amount?: null,
      extraData?: null
    ): ETHBridgeFinalizedEventFilter;

    "ETHBridgeInitiated(address,address,uint256,bytes)"(
      from?: string | null,
      to?: string | null,
      amount?: null,
      extraData?: null
    ): ETHBridgeInitiatedEventFilter;
    ETHBridgeInitiated(
      from?: string | null,
      to?: string | null,
      amount?: null,
      extraData?: null
    ): ETHBridgeInitiatedEventFilter;

    "ETHDepositInitiated(address,address,uint256,bytes)"(
      from?: string | null,
      to?: string | null,
      amount?: null,
      extraData?: null
    ): ETHDepositInitiatedEventFilter;
    ETHDepositInitiated(
      from?: string | null,
      to?: string | null,
      amount?: null,
      extraData?: null
    ): ETHDepositInitiatedEventFilter;

    "ETHWithdrawalFinalized(address,address,uint256,bytes)"(
      from?: string | null,
      to?: string | null,
      amount?: null,
      extraData?: null
    ): ETHWithdrawalFinalizedEventFilter;
    ETHWithdrawalFinalized(
      from?: string | null,
      to?: string | null,
      amount?: null,
      extraData?: null
    ): ETHWithdrawalFinalizedEventFilter;
  };

  estimateGas: {
    MESSENGER(overrides?: CallOverrides): Promise<BigNumber>;

    OTHER_BRIDGE(overrides?: CallOverrides): Promise<BigNumber>;

    bridgeERC20(
      _localToken: string,
      _remoteToken: string,
      _amount: BigNumberish,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    bridgeERC20To(
      _localToken: string,
      _remoteToken: string,
      _to: string,
      _amount: BigNumberish,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    bridgeETH(
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<BigNumber>;

    bridgeETHTo(
      _to: string,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<BigNumber>;

    depositERC20(
      _l1Token: string,
      _l2Token: string,
      _amount: BigNumberish,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    depositERC20To(
      _l1Token: string,
      _l2Token: string,
      _to: string,
      _amount: BigNumberish,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    depositETH(
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<BigNumber>;

    depositETHTo(
      _to: string,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<BigNumber>;

    deposits(
      arg0: string,
      arg1: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    finalizeBridgeERC20(
      _localToken: string,
      _remoteToken: string,
      _from: string,
      _to: string,
      _amount: BigNumberish,
      _extraData: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    finalizeBridgeETH(
      _from: string,
      _to: string,
      _amount: BigNumberish,
      _extraData: BytesLike,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<BigNumber>;

    finalizeERC20Withdrawal(
      _l1Token: string,
      _l2Token: string,
      _from: string,
      _to: string,
      _amount: BigNumberish,
      _extraData: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    finalizeETHWithdrawal(
      _from: string,
      _to: string,
      _amount: BigNumberish,
      _extraData: BytesLike,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<BigNumber>;

    l2TokenBridge(overrides?: CallOverrides): Promise<BigNumber>;

    messenger(overrides?: CallOverrides): Promise<BigNumber>;

    version(overrides?: CallOverrides): Promise<BigNumber>;
  };

  populateTransaction: {
    MESSENGER(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    OTHER_BRIDGE(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    bridgeERC20(
      _localToken: string,
      _remoteToken: string,
      _amount: BigNumberish,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    bridgeERC20To(
      _localToken: string,
      _remoteToken: string,
      _to: string,
      _amount: BigNumberish,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    bridgeETH(
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    bridgeETHTo(
      _to: string,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    depositERC20(
      _l1Token: string,
      _l2Token: string,
      _amount: BigNumberish,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    depositERC20To(
      _l1Token: string,
      _l2Token: string,
      _to: string,
      _amount: BigNumberish,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    depositETH(
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    depositETHTo(
      _to: string,
      _minGasLimit: BigNumberish,
      _extraData: BytesLike,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    deposits(
      arg0: string,
      arg1: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    finalizeBridgeERC20(
      _localToken: string,
      _remoteToken: string,
      _from: string,
      _to: string,
      _amount: BigNumberish,
      _extraData: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    finalizeBridgeETH(
      _from: string,
      _to: string,
      _amount: BigNumberish,
      _extraData: BytesLike,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    finalizeERC20Withdrawal(
      _l1Token: string,
      _l2Token: string,
      _from: string,
      _to: string,
      _amount: BigNumberish,
      _extraData: BytesLike,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    finalizeETHWithdrawal(
      _from: string,
      _to: string,
      _amount: BigNumberish,
      _extraData: BytesLike,
      overrides?: PayableOverrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    l2TokenBridge(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    messenger(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    version(overrides?: CallOverrides): Promise<PopulatedTransaction>;
  };
}
