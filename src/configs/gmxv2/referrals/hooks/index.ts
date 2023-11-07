import { BigNumberish, ethers } from 'ethers'

import ReferralStorage from '../../abis/ReferralStorage.json'
import { getContract } from '../../config/contracts'
import { isAddress } from 'ethers/lib/utils'

import { UserReferralInfo } from '../types'
import { decodeReferralCode, encodeReferralCode } from '../utils'
import { getReferralsGraphClient } from '../../lib/subgraph'
import { basisPointsToFloat } from '../../lib/numbers'
import { contractFetcher } from '../../lib/contracts/contractFetcher'
import { rpc } from 'viem/utils'
import { ARBITRUM } from '../../../gmx/chains'
import { isAddressZero, isHashZero } from '../../../../common/helper'

// export * from './useReferralsData'

export const REGEX_VERIFY_BYTES32 = /^0x[0-9a-f]{64}$/
export const REFERRAL_CODE_KEY = 'GMX-referralCode'

export async function useUserReferralInfo(
  chainId: number,
  account?: string | null,
  skipLocalReferralCode = false
): Promise<UserReferralInfo | undefined> {
  const { userReferralCode, userReferralCodeString, attachedOnChain, referralCodeForTxn } = await useUserReferralCode(
    chainId,
    account,
    skipLocalReferralCode
  )

  const { codeOwner } = await useCodeOwner(chainId, account, userReferralCode)
  const { affiliateTier: tierId } = await useAffiliateTier(chainId, codeOwner)
  const { totalRebate, discountShare } = await useTiers(chainId, tierId)
  const { discountShare: customDiscountShare } = await useReferrerDiscountShare(chainId, codeOwner)
  const finalDiscountShare = customDiscountShare?.gt(0) ? customDiscountShare : discountShare
  if (
    !userReferralCode ||
    !userReferralCodeString ||
    !codeOwner ||
    !tierId ||
    !totalRebate ||
    !finalDiscountShare ||
    !referralCodeForTxn
  ) {
    return undefined
  }

  return {
    userReferralCode,
    userReferralCodeString,
    referralCodeForTxn,
    attachedOnChain,
    affiliate: codeOwner,
    tierId,
    totalRebate,
    totalRebateFactor: basisPointsToFloat(totalRebate),
    discountShare: finalDiscountShare,
    discountFactor: basisPointsToFloat(finalDiscountShare)
  }
}

export async function useAffiliateTier(chainId, account) {
  const referralStorageAddress = getContract(chainId, 'ReferralStorage')
  const { data: affiliateTier, mutate: mutateReferrerTier } = (await contractFetcher(ReferralStorage)(
    account && [`ReferralStorage:referrerTiers`, chainId, referralStorageAddress, 'referrerTiers', account]
  )) as any

  return {
    affiliateTier,
    mutateReferrerTier
  }
}

export async function useTiers(chainId: number, tierLevel?: BigNumberish) {
  const referralStorageAddress = getContract(chainId, 'ReferralStorage')

  const { data: [totalRebate, discountShare] = [] } = (await contractFetcher(ReferralStorage)(
    tierLevel ? [`ReferralStorage:referrerTiers`, chainId, referralStorageAddress, 'tiers', tierLevel.toString()] : null
  )) as any

  return {
    totalRebate,
    discountShare
  }
}

export async function getReferralCodeOwner(chainId, referralCode) {
  const referralStorageAddress = getContract(chainId, 'ReferralStorage')
  const provider = rpc[ARBITRUM]
  const contract = new ethers.Contract(referralStorageAddress, ReferralStorage.abi, provider)
  const codeOwner = await contract.codeOwners(referralCode)
  return codeOwner
}

export async function useUserReferralCode(chainId, account, skipLocalReferralCode = false) {
  // TODO - modify to use localStorage for referral code
  const localStorageCode = '0x7261676574726164650000000000000000000000000000000000000000000000'
  const referralStorageAddress = getContract(chainId, 'ReferralStorage')
  const { data: onChainCode } = (await contractFetcher(ReferralStorage)(
    account && ['ReferralStorage', chainId, referralStorageAddress, 'traderReferralCodes', account]
  )) as any

  const { data: localStorageCodeOwner } = (await contractFetcher(ReferralStorage)(
    localStorageCode && REGEX_VERIFY_BYTES32.test(localStorageCode)
      ? ['ReferralStorage', chainId, referralStorageAddress, 'codeOwners', localStorageCode]
      : null
  )) as any

  const { attachedOnChain, userReferralCode, userReferralCodeString, referralCodeForTxn } = useUserReferralCodeInternal(
    skipLocalReferralCode,
    onChainCode,
    localStorageCodeOwner,
    localStorageCode
  )

  return {
    userReferralCode,
    userReferralCodeString,
    attachedOnChain,
    referralCodeForTxn
  }
}

function useUserReferralCodeInternal(skipLocalReferralCode, onChainCode, localStorageCodeOwner, localStorageCode) {
  let attachedOnChain = false
  let userReferralCode: string | undefined = undefined
  let userReferralCodeString: string | undefined = undefined
  let referralCodeForTxn = ethers.constants.HashZero

  if (skipLocalReferralCode || (onChainCode && !isHashZero(onChainCode))) {
    attachedOnChain = true
    userReferralCode = onChainCode
    userReferralCodeString = decodeReferralCode(onChainCode)
  } else if (localStorageCodeOwner && !isAddressZero(localStorageCodeOwner)) {
    attachedOnChain = false
    userReferralCode = localStorageCode!
    userReferralCodeString = decodeReferralCode(localStorageCode!)
    referralCodeForTxn = localStorageCode!
  }

  return {
    attachedOnChain,
    userReferralCode,
    userReferralCodeString,
    referralCodeForTxn
  }
}

export async function useReferrerTier(chainId, account) {
  const referralStorageAddress = getContract(chainId, 'ReferralStorage')
  const validAccount = isAddress(account) ? account : null
  const { data: referrerTier, mutate: mutateReferrerTier } = (await contractFetcher(ReferralStorage)(
    validAccount && [`ReferralStorage:referrerTiers`, chainId, referralStorageAddress, 'referrerTiers', validAccount]
  )) as any

  return {
    referrerTier,
    mutateReferrerTier
  }
}

export async function useCodeOwner(chainId, account, code) {
  console.log({ account, code })
  const referralStorageAddress = getContract(chainId, 'ReferralStorage')
  const { data: codeOwner, mutate: mutateCodeOwner } = (await contractFetcher(ReferralStorage)(
    account && code && [`ReferralStorage:codeOwners`, chainId, referralStorageAddress, 'codeOwners', , code]
  )) as any

  return {
    codeOwner,
    mutateCodeOwner
  }
}

export async function useReferrerDiscountShare(chainId, owner) {
  const referralStorageAddress = getContract(chainId, 'ReferralStorage')
  const { data: discountShare, mutate: mutateDiscountShare } = (await contractFetcher(ReferralStorage)(
    owner && [
      `ReferralStorage:referrerDiscountShares`,
      chainId,
      referralStorageAddress,
      'referrerDiscountShares',
      owner.toLowerCase()
    ]
  )) as any

  return {
    discountShare,
    mutateDiscountShare
  }
}

export async function validateReferralCodeExists(referralCode, chainId) {
  const referralCodeBytes32 = encodeReferralCode(referralCode)
  const referralCodeOwner = await getReferralCodeOwner(chainId, referralCodeBytes32)
  return !isAddressZero(referralCodeOwner)
}
