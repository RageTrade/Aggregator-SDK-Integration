import { BigNumberish, ethers } from 'ethers'

import ReferralStorage from '../../abis/ReferralStorage.json'
import { getContract } from '../../config/contracts'
import { isAddress } from 'ethers/lib/utils'

import { UserReferralInfo } from '../types'
import { decodeReferralCode, encodeReferralCode } from '../utils'
import { getReferralsGraphClient } from '../../lib/subgraph'
import { basisPointsToFloat } from '../../lib/numbers'
import { contractFetcher } from '../../lib/contracts/contractFetcher'
import { ARBITRUM } from '../../../gmx/chains'
import { isAddressZero, isHashZero } from '../../../../common/helper'
import { rpc } from '../../../../common/provider'
import { CACHE_DAY, CACHE_TIME_MULT, cacheFetch, getStaleTime, GMXV2_CACHE_PREFIX } from '../../../../common/cache'
import { ApiOpts } from '../../../../interfaces/V1/IRouterAdapterBaseV1'

// export * from './useReferralsData'

export const REGEX_VERIFY_BYTES32 = /^0x[0-9a-f]{64}$/
export const REFERRAL_CODE_KEY = 'GMX-referralCode'

export async function useUserReferralInfo(
  chainId: number,
  account: string,
  opts?: ApiOpts
): Promise<UserReferralInfo | undefined> {
  // hardcode it as we dont have a concept of local referral code
  const skipLocalReferralCode = true

  const sTimeDay = getStaleTime(CACHE_DAY, opts)
  const { userReferralCode, userReferralCodeString, attachedOnChain, referralCodeForTxn } = await cacheFetch({
    key: [GMXV2_CACHE_PREFIX, 'useUserReferralCode', chainId, account],
    fn: () => useUserReferralCode(chainId, account, skipLocalReferralCode),
    staleTime: sTimeDay,
    cacheTime: sTimeDay * CACHE_TIME_MULT,
    opts
  })

  if (!userReferralCode) {
    return undefined
  }

  const { codeOwner } = await cacheFetch({
    key: [GMXV2_CACHE_PREFIX, 'useCodeOwner', chainId, account, userReferralCode],
    fn: () => useCodeOwner(chainId, account, userReferralCode),
    staleTime: sTimeDay,
    cacheTime: sTimeDay * CACHE_TIME_MULT,
    opts
  })
  const { affiliateTier: tierId } = await cacheFetch({
    key: [GMXV2_CACHE_PREFIX, 'useAffiliateTier', chainId, codeOwner],
    fn: () => useAffiliateTier(chainId, codeOwner),
    staleTime: sTimeDay,
    cacheTime: sTimeDay * CACHE_TIME_MULT,
    opts
  })
  const tiersPromise = cacheFetch({
    key: [GMXV2_CACHE_PREFIX, 'useTiers', chainId, tierId],
    fn: () => useTiers(chainId, tierId),
    staleTime: sTimeDay,
    cacheTime: sTimeDay * CACHE_TIME_MULT,
    opts
  })
  const referrerDiscountSharePromise = cacheFetch({
    key: [GMXV2_CACHE_PREFIX, 'useReferrerDiscountShare', chainId, codeOwner],
    fn: () => useReferrerDiscountShare(chainId, codeOwner),
    staleTime: sTimeDay,
    cacheTime: sTimeDay * CACHE_TIME_MULT,
    opts
  })

  const [{ totalRebate, discountShare }, { discountShare: customDiscountShare }] = await Promise.all([
    tiersPromise,
    referrerDiscountSharePromise
  ])

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

export async function useAffiliateTier(chainId: number, account: string) {
  const referralStorageAddress = getContract(chainId, 'ReferralStorage')
  const affiliateTier = (await contractFetcher(ReferralStorage)(
    account && [`ReferralStorage:referrerTiers`, chainId, referralStorageAddress, 'referrerTiers', account]
  )) as any

  return {
    affiliateTier
  }
}

export async function useTiers(chainId: number, tierLevel?: BigNumberish) {
  const referralStorageAddress = getContract(chainId, 'ReferralStorage')

  const [totalRebate, discountShare] = ([] = (await contractFetcher(ReferralStorage)(
    tierLevel ? [`ReferralStorage:referrerTiers`, chainId, referralStorageAddress, 'tiers', tierLevel.toString()] : null
  )) as any)

  return {
    totalRebate,
    discountShare
  }
}

export async function getReferralCodeOwner(chainId: number, referralCode: string) {
  const referralStorageAddress = getContract(chainId, 'ReferralStorage')
  const provider = rpc[ARBITRUM]
  const contract = new ethers.Contract(referralStorageAddress, ReferralStorage.abi, provider)
  const codeOwner = await contract.codeOwners(referralCode)
  return codeOwner
}

export async function useUserReferralCode(chainId: number, account: string, skipLocalReferralCode = false) {
  const referralStorageAddress = getContract(chainId, 'ReferralStorage')
  const onChainCode = (await contractFetcher(ReferralStorage)(
    account && ['ReferralStorage', chainId, referralStorageAddress, 'traderReferralCodes', account]
  )) as any

  const { attachedOnChain, userReferralCode, userReferralCodeString, referralCodeForTxn } = useUserReferralCodeInternal(
    skipLocalReferralCode,
    onChainCode
  )

  return {
    userReferralCode,
    userReferralCodeString,
    attachedOnChain,
    referralCodeForTxn
  }
}

function useUserReferralCodeInternal(skipLocalReferralCode: boolean, onChainCode: string) {
  let attachedOnChain = false
  let userReferralCode: string | undefined = undefined
  let userReferralCodeString: string | undefined = undefined
  let referralCodeForTxn = ethers.constants.HashZero

  if (skipLocalReferralCode || (onChainCode && !isHashZero(onChainCode))) {
    attachedOnChain = true
    userReferralCode = onChainCode
    userReferralCodeString = decodeReferralCode(onChainCode)
  }

  return {
    attachedOnChain,
    userReferralCode,
    userReferralCodeString,
    referralCodeForTxn
  }
}

export async function useReferrerTier(chainId: number, account: string) {
  const referralStorageAddress = getContract(chainId, 'ReferralStorage')
  const validAccount = isAddress(account) ? account : null
  const referrerTier = (await contractFetcher(ReferralStorage)(
    validAccount && [`ReferralStorage:referrerTiers`, chainId, referralStorageAddress, 'referrerTiers', validAccount]
  )) as any

  return {
    referrerTier
  }
}

export async function useCodeOwner(chainId: number, account: string, code: string) {
  const referralStorageAddress = getContract(chainId, 'ReferralStorage')
  const codeOwner = (await contractFetcher(ReferralStorage)(
    account && code && [`ReferralStorage:codeOwners`, chainId, referralStorageAddress, 'codeOwners', code]
  )) as any

  return {
    codeOwner
  }
}

export async function useReferrerDiscountShare(chainId: number, owner: string) {
  const referralStorageAddress = getContract(chainId, 'ReferralStorage')
  const discountShare = (await contractFetcher(ReferralStorage)(
    owner && [
      `ReferralStorage:referrerDiscountShares`,
      chainId,
      referralStorageAddress,
      'referrerDiscountShares',
      owner.toLowerCase()
    ]
  )) as any

  return {
    discountShare
  }
}

export async function validateReferralCodeExists(referralCode: string, chainId: number) {
  const referralCodeBytes32 = encodeReferralCode(referralCode)
  const referralCodeOwner = await getReferralCodeOwner(chainId, referralCodeBytes32)
  return !isAddressZero(referralCodeOwner)
}
