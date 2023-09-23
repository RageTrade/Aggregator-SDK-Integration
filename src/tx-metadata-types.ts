import { BigNumber } from "ethers"

export interface BaseAdditionalSessionData {
  chainId: number
}

export interface ERC20ApprovalAddtionalSessionData extends BaseAdditionalSessionData {
  token: string
  spender: string
}

export interface AddressValidationAdditionalSessionData extends BaseAdditionalSessionData {
  destinationAddress: string
}

