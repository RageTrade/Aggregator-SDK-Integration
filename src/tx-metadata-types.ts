export type ValidationModule =
  "LIFI" |
  "SNX_V2" |
  "GMX_V1" |
  "NATIVE_TOKEN" |
  "ERC20_APPROVAL" |
  "ADDRESS_VALIDATOR" |
  "ADDRESS_SELECTOR_VALIDATOR"

export interface BaseSessionModule {
  module: ValidationModule
}

export interface BaseAdditionalSessionData {
  chainId: number
}

export interface ERC20ApprovalSessionKeyData extends BaseSessionModule {
  chainId: number
}

export interface ERC20ApprovalAddtionalSessionData extends BaseAdditionalSessionData {
  token: string
  spender: string
}

export interface GMXV1SessionKeyData extends BaseSessionModule {
  sender: string
}

// No additional data for GMXV1

export interface LifiSessionKeyData extends BaseSessionModule {
  sender: string
}

// No additional data for Lifi

export interface SynthetixV2SessionKeyData extends BaseSessionModule { }

// No additional data for SynthetixV2

export interface NativeTokenSessionKeyData extends BaseSessionModule {
  recipient: string
  maxAmount: string
}

// No additional data for NativeToken

export interface AddressValidationSessionKeyData extends BaseSessionModule { }

export interface AddressValidationAdditionalSessionData extends BaseAdditionalSessionData {
  destinationAddress: string
}
