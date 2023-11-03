/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import { Provider } from "@ethersproject/providers";
import type { IAdmin, IAdminInterface } from "../IAdmin";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_admin",
        type: "address",
      },
    ],
    name: "setAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export class IAdmin__factory {
  static readonly abi = _abi;
  static createInterface(): IAdminInterface {
    return new utils.Interface(_abi) as IAdminInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): IAdmin {
    return new Contract(address, _abi, signerOrProvider) as IAdmin;
  }
}