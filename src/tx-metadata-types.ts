export interface BaseSessionKeyData {
  sessionKey: string
}

export interface BaseAdditionalSessionData {
  chainId: number
}

export interface ERC20ApprovalSessionKeyData extends BaseSessionKeyData {
  chainId: number
}

export interface ERC20ApprovalAddtionalSessionData extends BaseAdditionalSessionData {
  token: string
  spender: string
}

export interface GMXV1SessionKeyData extends BaseSessionKeyData {
  sender: string
}

// No additional data for GMXV1

export interface LifiSessionKeyData extends BaseSessionKeyData {
  sender: string
}

// No additional data for Lifi

export interface SynthetixV2SessionKeyData extends BaseSessionKeyData {
}

// No additional data for SynthetixV2

export interface NativeTokenSessionKeyData extends BaseSessionKeyData {
  recipient: string
  maxAmount: string
}

// No additional data for NativeToken

export interface AddressValidationSessionKeyData extends BaseSessionKeyData {
  chainId: number
}

export interface AddressValidationAdditionalSessionData extends BaseAdditionalSessionData {
  destinationAddress: string
}
