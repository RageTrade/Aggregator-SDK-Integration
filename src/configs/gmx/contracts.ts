import { ethers } from "ethers";
import {
  ARBITRUM,
  ARBITRUM_TESTNET,
  AVALANCHE,
  AVALANCHE_FUJI,
  NetworkConstant,
} from "./chains";

const { AddressZero } = ethers.constants;

export const XGMT_EXCLUDED_ACCOUNTS = [
  "0x330eef6b9b1ea6edd620c825c9919dc8b611d5d5",
  "0xd9b1c23411adbb984b1c4be515fafc47a12898b2",
  "0xa633158288520807f91ccc98aa58e0ea43acb400",
  "0xffd0a93b4362052a336a7b22494f1b77018dd34b",
];

export type NetworkContracts = {
  Vault: string;
  Router: string;
  VaultReader: string;
  Reader: string;
  GlpManager: string;
  RewardRouter: string;
  RewardReader: string;
  NATIVE_TOKEN: string;
  GLP: string;
  GMX: string;
  ES_GMX: string;
  BN_GMX: string;
  USDG: string;
  ES_GMX_IOU: string;
  StakedGmxTracker: string;
  BonusGmxTracker: string;
  FeeGmxTracker: string;
  StakedGlpTracker: string;
  FeeGlpTracker: string;

  StakedGmxDistributor: string;
  StakedGlpDistributor: string;

  GmxVester: string;
  GlpVester: string;

  OrderBook: string;
  OrderBookReader: string;

  PositionRouter: string;
  PositionManager: string;

  // UniswapGmxEthPool: string,
  ReferralStorage: string;
  ReferralReader: string;

  Multicall?: string;
  GlpRewardRouter?: string;
  OrderExecutor?: string;
  UniswapGmxEthPool?: string;
  Timelock?: string;
  TraderJoeGmxAvaxPool?: string;
};

const CONTRACTS: { [chainId: number]: NetworkContracts } = {
  [ARBITRUM_TESTNET]: {
    // arbitrum testnet
    Vault: "0xBc9BC47A7aB63db1E0030dC7B60DDcDe29CF4Ffb",
    Router: "0xe0d4662cdfa2d71477A7DF367d5541421FAC2547",
    VaultReader: "0xFc371E380262536c819D12B9569106bf032cC41c",
    Reader: "0x2E093c70E3A7E4919611d2555dFd8D697d2fC0a1",
    GlpManager: "0xD875d99E09118d2Be80579b9d23E83469077b498",
    RewardRouter: "0x0000000000000000000000000000000000000000",
    RewardReader: "0x0000000000000000000000000000000000000000",
    NATIVE_TOKEN: "0xB47e6A5f8b33b3F17603C83a0535A9dcD7E32681",
    GLP: "0xb4f81Fa74e06b5f762A104e47276BA9b2929cb27",
    GMX: "0x0000000000000000000000000000000000000000",
    ES_GMX: "0x0000000000000000000000000000000000000000",
    BN_GMX: "0x0000000000000000000000000000000000000000",
    USDG: "0xBCDCaF67193Bf5C57be08623278fCB69f4cA9e68",
    ES_GMX_IOU: "0x0000000000000000000000000000000000000000",
    StakedGmxTracker: "0x0000000000000000000000000000000000000000",
    BonusGmxTracker: "0x0000000000000000000000000000000000000000",
    FeeGmxTracker: "0x0000000000000000000000000000000000000000",
    StakedGlpTracker: "0x0000000000000000000000000000000000000000",
    FeeGlpTracker: "0x0000000000000000000000000000000000000000",

    StakedGmxDistributor: "0x0000000000000000000000000000000000000000",
    StakedGlpDistributor: "0x0000000000000000000000000000000000000000",

    GmxVester: "0x0000000000000000000000000000000000000000",
    GlpVester: "0x0000000000000000000000000000000000000000",

    OrderBook: "0xebD147E5136879520dDaDf1cA8FBa48050EFf016",
    OrderBookReader: "0xC492c8d82DC576Ad870707bb40EDb63E2026111E",

    PositionRouter: "0xB4bB78cd12B097603e2b55D2556c09C17a5815F8",
    PositionManager: "0x168aDa266c2f10C1F37973B213d6178551030e44",

    // UniswapGmxEthPool: "0x80A9ae39310abf666A87C743d6ebBD0E8C42158E",
    ReferralStorage: "0x0000000000000000000000000000000000000000",
    ReferralReader: "0x0000000000000000000000000000000000000000",

    Multicall: "0xcA11bde05977b3631167028862bE2a173976CA11",
  },
  [ARBITRUM]: {
    // arbitrum mainnet
    Vault: "0x489ee077994B6658eAfA855C308275EAd8097C4A",
    Router: "0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064",
    VaultReader: "0xfebB9f4CAC4cD523598fE1C5771181440143F24A",
    Reader: "0x2b43c90D1B727cEe1Df34925bcd5Ace52Ec37694",
    GlpManager: "0x3963FfC9dff443c2A94f21b129D429891E32ec18",
    RewardRouter: "0xA906F338CB21815cBc4Bc87ace9e68c87eF8d8F1",
    GlpRewardRouter: "0xB95DB5B167D75e6d04227CfFFA61069348d271F5",
    RewardReader: "0x8BFb8e82Ee4569aee78D03235ff465Bd436D40E0",
    NATIVE_TOKEN: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    GLP: "0x4277f8F2c384827B5273592FF7CeBd9f2C1ac258",
    GMX: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
    ES_GMX: "0xf42Ae1D54fd613C9bb14810b0588FaAa09a426cA",
    BN_GMX: "0x35247165119B69A40edD5304969560D0ef486921",
    USDG: "0x45096e7aA921f27590f8F19e457794EB09678141",
    ES_GMX_IOU: "0x6260101218eC4cCfFF1b778936C6f2400f95A954",
    StakedGmxTracker: "0x908C4D94D34924765f1eDc22A1DD098397c59dD4",
    BonusGmxTracker: "0x4d268a7d4C16ceB5a606c173Bd974984343fea13",
    FeeGmxTracker: "0xd2D1162512F927a7e282Ef43a362659E4F2a728F",
    StakedGlpTracker: "0x1aDDD80E6039594eE970E5872D247bf0414C8903",
    FeeGlpTracker: "0x4e971a87900b931fF39d1Aad67697F49835400b6",

    StakedGmxDistributor: "0x23208B91A98c7C1CD9FE63085BFf68311494F193",
    StakedGlpDistributor: "0x60519b48ec4183a61ca2B8e37869E675FD203b34",

    GmxVester: "0x199070DDfd1CFb69173aa2F7e20906F26B363004",
    GlpVester: "0xA75287d2f8b217273E7FCD7E86eF07D33972042E",

    OrderBook: "0x09f77E8A13De9a35a7231028187e9fD5DB8a2ACB",
    OrderExecutor: "0x7257ac5D0a0aaC04AA7bA2AC0A6Eb742E332c3fB",
    OrderBookReader: "0xa27C20A7CF0e1C68C0460706bB674f98F362Bc21",

    PositionRouter: "0xb87a436B93fFE9D75c5cFA7bAcFff96430b09868",
    PositionManager: "0x75E42e6f01baf1D6022bEa862A28774a9f8a4A0C",

    UniswapGmxEthPool: "0x80A9ae39310abf666A87C743d6ebBD0E8C42158E",
    ReferralStorage: "0xe6fab3f0c7199b0d34d7fbe83394fc0e0d06e99d",
    ReferralReader: "0x8Aa382760BCdCe8644C33e6C2D52f6304A76F5c8",

    Timelock: "0xaa50bD556CE0Fe61D4A57718BA43177a3aB6A597",

    Multicall: "0xcA11bde05977b3631167028862bE2a173976CA11",
  },
  [AVALANCHE]: {
    // avalanche
    Vault: "0x9ab2De34A33fB459b538c43f251eB825645e8595",
    Router: "0x5F719c2F1095F7B9fc68a68e35B51194f4b6abe8",
    VaultReader: "0x66eC8fc33A26feAEAe156afA3Cb46923651F6f0D",
    Reader: "0x2eFEE1950ededC65De687b40Fd30a7B5f4544aBd",
    GlpManager: "0xD152c7F25db7F4B95b7658323c5F33d176818EE4",
    RewardRouter: "0x82147C5A7E850eA4E28155DF107F2590fD4ba327",
    GlpRewardRouter: "0xB70B91CE0771d3f4c81D87660f71Da31d48eB3B3",
    RewardReader: "0x04Fc11Bd28763872d143637a7c768bD96E44c1b6",
    NATIVE_TOKEN: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    GLP: "0x01234181085565ed162a948b6a5e88758CD7c7b8",
    GMX: "0x62edc0692BD897D2295872a9FFCac5425011c661",
    ES_GMX: "0xFf1489227BbAAC61a9209A08929E4c2a526DdD17",
    BN_GMX: "0x8087a341D32D445d9aC8aCc9c14F5781E04A26d2",
    USDG: "0xc0253c3cC6aa5Ab407b5795a04c28fB063273894",
    ES_GMX_IOU: "0x6260101218eC4cCfFF1b778936C6f2400f95A954", // placeholder address

    StakedGmxTracker: "0x2bD10f8E93B3669b6d42E74eEedC65dd1B0a1342",
    BonusGmxTracker: "0x908C4D94D34924765f1eDc22A1DD098397c59dD4",
    FeeGmxTracker: "0x4d268a7d4C16ceB5a606c173Bd974984343fea13",
    StakedGlpTracker: "0x9e295B5B976a184B14aD8cd72413aD846C299660",
    FeeGlpTracker: "0xd2D1162512F927a7e282Ef43a362659E4F2a728F",

    StakedGmxDistributor: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
    StakedGlpDistributor: "0xDd593Cf40734199afc9207eBe9ffF23dA4Bf7720",

    GmxVester: "0x472361d3cA5F49c8E633FB50385BfaD1e018b445",
    GlpVester: "0x62331A7Bd1dfB3A7642B7db50B5509E57CA3154A",

    OrderBook: "0x4296e307f108B2f583FF2F7B7270ee7831574Ae5",
    OrderExecutor: "0x4296e307f108B2f583FF2F7B7270ee7831574Ae5",
    OrderBookReader: "0xccFE3E576f8145403d3ce8f3c2f6519Dae40683B",

    PositionRouter: "0xffF6D276Bc37c61A23f06410Dce4A400f66420f8",
    PositionManager: "0xA21B83E579f4315951bA658654c371520BDcB866",

    TraderJoeGmxAvaxPool: "0x0c91a070f862666bbcce281346be45766d874d98",
    ReferralStorage: "0x827ed045002ecdabeb6e2b0d1604cf5fc3d322f8",
    ReferralReader: "0x505Ce16D3017be7D76a7C2631C0590E71A975083",

    Timelock: "0x8A68a039D555599Fd745f9343e8dE20C9eaFca75",

    Multicall: "0xcA11bde05977b3631167028862bE2a173976CA11",
  },

  [AVALANCHE_FUJI]: {
    Vault: AddressZero,
    Router: AddressZero,
    VaultReader: AddressZero,
    Reader: AddressZero,
    GlpManager: AddressZero,
    RewardRouter: AddressZero,
    RewardReader: AddressZero,
    NATIVE_TOKEN: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
    GLP: AddressZero,
    GMX: AddressZero,
    ES_GMX: AddressZero,
    BN_GMX: AddressZero,
    USDG: AddressZero,
    ES_GMX_IOU: AddressZero,

    StakedGmxTracker: AddressZero,
    BonusGmxTracker: AddressZero,
    FeeGmxTracker: AddressZero,
    StakedGlpTracker: AddressZero,
    FeeGlpTracker: AddressZero,

    StakedGmxDistributor: AddressZero,
    StakedGlpDistributor: AddressZero,

    GmxVester: AddressZero,
    GlpVester: AddressZero,

    OrderBook: AddressZero,
    OrderExecutor: AddressZero,
    OrderBookReader: AddressZero,

    PositionRouter: AddressZero,
    PositionManager: AddressZero,

    TraderJoeGmxAvaxPool: AddressZero,
    ReferralStorage: AddressZero,
    ReferralReader: AddressZero,
  },
};

export function getContract(chainId: number, name: keyof NetworkContracts) {
  if (chainId == ARBITRUM_TESTNET) {
    return CONTRACTS[ARBITRUM_TESTNET][name];
  } else if (chainId == AVALANCHE_FUJI) {
    return CONTRACTS[AVALANCHE_FUJI][name];
  } else if (chainId == ARBITRUM) {
    return CONTRACTS[ARBITRUM][name];
  }
  return CONTRACTS[AVALANCHE][name];
}
