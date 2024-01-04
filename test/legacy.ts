import KwentaSDK from '@kwenta/sdk'
import { BigNumber, ethers, Signer, BigNumberish, UnsignedTransaction, Transaction } from 'ethers'
import { config } from 'dotenv'
import {
  ContractOrderType,
  FuturesMarket,
  FuturesMarketAsset,
  FuturesPosition,
  PositionSide
} from '@kwenta/sdk/dist/types'
import Wei, { wei } from '@synthetixio/wei'
import SynthetixV2Service from '../src/exchanges/synthetixv2'
import {
  ExtendedMarket,
  ExtendedPosition,
  Mode,
  OrderDirection,
  OrderType,
  UnsignedTxWithMetadata
} from '../src/interface'
import GmxV1Service from '../src/exchanges/gmxv1'
import { formatAmount, getTokenBySymbol } from '../src/configs/gmx/tokens'
import { ARBITRUM } from '../src/configs/gmx/chains'
import CompositeService from '../src/common/compositeService'
import { FuturesMarketKey } from '@kwenta/sdk/dist/types/futures'
import { logObject } from '../src/common/helper'
import { formatUnits, parseUnits } from 'ethers/lib/utils'
import { getTokenPrice, getTokenPriceD, startStreaming, startHermesStreaming } from '../src/configs/pyth/prices'
import { PositionInfo } from '../src/interfaces/V1/IRouterAdapterBaseV1'
import { rpc } from '../src/common/provider'

config()

const { ALCHEMY_KEY_OP_MAIN, PRIVATE_KEY, W2, PRIVATE_KEY2, W1, PRIVATE_KEY1 } = process.env

const w = W1!.toString()
const wpk = PRIVATE_KEY1!.toString()

let provider = new ethers.providers.AlchemyProvider(
  10,
  'F5JltP3quuOpkC_Dzg5bzmDppydPAO1i'
  // ALCHEMY_KEY_OP_MAIN!.toString()
)

const signer = new ethers.Wallet(wpk, provider)

const sdk = new KwentaSDK({
  networkId: 10,
  provider: rpc[10]
  // provider: new ethers.providers.JsonRpcProvider(
  //   'https://optimism.blockpi.network/v1/rpc/e9eb838be05076b18bceb9e7efe3797c93bed264',
  //   10
  // )
})

async function fireTxs(utxs: UnsignedTransaction[]) {
  for (let i = 0; i < utxs.length; i++) {
    await fireTx(utxs[i])
  }
}

async function fireTx(utx: UnsignedTransaction) {
  const tx = await signer.sendTransaction(utx as ethers.providers.TransactionRequest)
  console.log('Transaction: ', tx.hash)
  await tx.wait(10)

  return tx
}

async function getTradePreview(
  user: string,
  ss: SynthetixV2Service,
  sizeDelta: string,
  marginDelta: string,
  direction: 'LONG' | 'SHORT',
  triggerPrice: BigNumber,
  market: ExtendedMarket
) {
  const tradePreview = await ss.getTradePreview(
    user,
    provider,
    market,
    {
      type: 'MARKET_INCREASE',
      direction: direction,
      inputCollateral: {
        name: 'string',
        symbol: 'string',
        decimals: 'string',
        address: 'string'
      },
      inputCollateralAmount: ethers.utils.parseUnits(marginDelta),
      sizeDelta: ethers.utils.parseEther(sizeDelta),
      isTriggerOrder: false,
      referralCode: undefined,
      trigger: {
        triggerPrice: triggerPrice,
        triggerAboveThreshold: true
      },
      slippage: '1'
    },
    undefined,
    { bypassCache: true, overrideStaleTime: undefined }
  )
  return tradePreview
}

async function createLongOrder(
  ss: SynthetixV2Service,
  sizeDelta: string,
  direction: 'LONG' | 'SHORT',
  triggerPrice: BigNumber,
  inputCollateral: string,
  wallet: string
): Promise<UnsignedTxWithMetadata[]> {
  const createOrderTxs = await ss.createOrder(
    provider,
    {
      mode: 'ASYNC',
      longCollateral: [],
      shortCollateral: [],
      indexOrIdentifier: 'sETHPERP',
      supportedOrderTypes: {
        LIMIT_DECREASE: true,
        LIMIT_INCREASE: true,
        MARKET_INCREASE: true,
        MARKET_DECREASE: true,
        DEPOSIT: true,
        WITHDRAW: true
      },
      protocolName: 'SYNTHETIX_V2'
    },
    {
      type: direction == 'LONG' ? 'MARKET_INCREASE' : 'MARKET_DECREASE',
      direction: direction,
      inputCollateral: {
        name: 'string',
        symbol: 'string',
        decimals: 'string',
        address: 'string'
      },
      inputCollateralAmount: ethers.utils.parseUnits(inputCollateral),
      sizeDelta: ethers.utils.parseEther(sizeDelta),
      isTriggerOrder: false,
      referralCode: undefined,
      trigger: {
        triggerPrice: triggerPrice,
        triggerAboveThreshold: true
      },
      slippage: '1'
    },
    wallet
  )

  return createOrderTxs
}

async function getIdleMargins(ss: SynthetixV2Service) {
  const idleMargins = await ss.getIdleMargins(w, undefined)
  idleMargins.forEach((idleMargin) => {
    logObject('Idle Margin: ', idleMargin)
  })
  return idleMargins
}

async function cancelDelayedOffChainOrder(ss: SynthetixV2Service, wallet: string): Promise<UnsignedTxWithMetadata[]> {
  const cancelOrder = await ss.cancelOrder(
    provider,
    {
      mode: 'ASYNC',
      longCollateral: [],
      shortCollateral: [],
      indexOrIdentifier: 'sETHPERP',
      supportedOrderTypes: {
        LIMIT_DECREASE: true,
        LIMIT_INCREASE: true,
        MARKET_INCREASE: true,
        MARKET_DECREASE: true,
        DEPOSIT: true,
        WITHDRAW: true
      },
      protocolName: 'SYNTHETIX_V2'
    },
    {},
    wallet
  )
  logObject('Cancel Order: ', cancelOrder)
  return cancelOrder
}

async function createTransferMarginOrder(
  ss: SynthetixV2Service,
  amount: BigNumber,
  wallet: string
): Promise<UnsignedTxWithMetadata[]> {
  const createOrder = await ss.createOrder(
    provider,
    {
      mode: 'ASYNC',
      longCollateral: [],
      shortCollateral: [],
      indexOrIdentifier: 'sETHPERP',
      supportedOrderTypes: {
        LIMIT_DECREASE: true,
        LIMIT_INCREASE: true,
        MARKET_INCREASE: true,
        MARKET_DECREASE: true,
        DEPOSIT: true,
        WITHDRAW: true
      },
      protocolName: 'SYNTHETIX_V2'
    },
    {
      type: 'LIMIT_INCREASE',
      direction: 'LONG',
      inputCollateral: {
        name: 'string',
        symbol: 'string',
        decimals: 'string',
        address: 'string'
      },
      inputCollateralAmount: amount,
      sizeDelta: ethers.utils.parseEther('0.01'),
      isTriggerOrder: false,
      referralCode: undefined,
      trigger: {
        triggerPrice: BigNumber.from('2000'),
        triggerAboveThreshold: true
      },
      slippage: '1'
    },
    wallet
  )
  logObject('Create Order: ', createOrder)
  return createOrder
}

async function main() {
  await sdk.setSigner(signer)

  const markets = await sdk.futures.getMarkets()
  const ethMarket = markets.find((market) => market.asset === 'sETH')
  // console.log("Eth market: ", ethMarket);

  const sizeInEther = '0.005'

  //await transferMargin(ethMarket!, "1");

  // await getFuturePositions(ethMarket!);

  // const fillPrice = (await isolatedTradePreview(ethMarket!, sizeInEther)).price;

  // await submitOrder(ethMarket!, fillPrice, sizeInEther);

  // await delay(5000);

  // await getFuturePositions(ethMarket!);

  // await getDelayedOrder(ethMarket!);

  // await cancelDelayedOrder(ethMarket!);

  // await closePosition(ethMarket!);

  // await withdrawAllMargin(ethMarket!);

  // await getFuturePositions(ethMarket!);
}

async function withdrawAllMargin(ethMarket: FuturesMarket) {
  const position = (await getFuturePositions(ethMarket!))[0]
  if (!position.accessibleMargin.eq(position.remainingMargin)) {
    console.log('Position is not closed yet'.toUpperCase())
  }
  const withdrawAllMargin = await sdk.futures.withdrawIsolatedMargin(
    ethMarket?.market!,
    wei(position.accessibleMargin!)
  )
  logObject('Withdraw all margin: ', withdrawAllMargin)
}

// async function closePosition(ethMarket: FuturesMarket) {
//   try {
//     await cancelDelayedOrder(ethMarket!);
//   } catch (e) {
//     console.log("Error cancelling delayed order: ", e);
//   }

//   const currentPosition = (await getFuturePositions(ethMarket!))[0];
//   const sizeInEther = currentPosition.position!.size!.neg().toString();
//   const itp = await isolatedTradePreview(ethMarket, sizeInEther);
//   console.log(
//     "itp.price: ",
//     itp.price.toString(),
//     "sizeInEther: ",
//     sizeInEther
//   );
//   // TODO - need to check how to get better desired price
//   await submitOrder(ethMarket!, wei(0), "-0.025");
// }

async function cancelDelayedOrder(ethMarket: FuturesMarket) {
  const cancelDelayedOrder = await sdk.futures.cancelDelayedOrder(ethMarket.market!, w, true)
  logObject('Cancel delayed order: ', cancelDelayedOrder)
}

async function getDelayedOrder(ethMarket: FuturesMarket) {
  const delayedOrder = await sdk.futures.getDelayedOrder(w, ethMarket.market!)
  logObject('Delayed order: ', delayedOrder)
}

async function transferMargin(ethMarket: FuturesMarket, amount: string) {
  const transferMargin = await sdk.futures.depositIsolatedMargin(
    ethMarket?.market!,
    wei(ethers.utils.parseUnits(amount))
  )
  logObject('Transfer margin: ', transferMargin)
}

// async function isolatedTradePreview(
//   ethMarket: FuturesMarket,
//   sizeInEther: string
// ): Promise<{
//   fee: Wei;
//   liqPrice: Wei;
//   margin: Wei;
//   price: Wei;
//   size: Wei;
//   sizeDelta: Wei;
//   side: PositionSide;
//   leverage: Wei;
//   notionalValue: Wei;
//   status: number;
//   showStatus: boolean;
//   statusMessage: string;
//   priceImpact: Wei;
//   exceedsPriceProtection: boolean;
// }> {
//   const isolatedTradePreview = await sdk.futures.getIsolatedTradePreview(
//     ethMarket?.market!,
//     ethMarket?.marketKey!,
//     ContractOrderType.DELAYED_OFFCHAIN,
//     {
//       sizeDelta: wei(ethers.utils.parseEther(sizeInEther)),
//       price: wei("0"),
//       leverageSide: PositionSide.LONG,
//     }
//   );
//   logObject("Isolated trade preview: ", isolatedTradePreview);

//   return isolatedTradePreview;
// }

async function submitOrder(ethMarket: FuturesMarket, fillPrice: Wei, sizeInEther: string) {
  const submitOrder = await sdk.futures.submitIsolatedMarginOrder(
    ethMarket?.market!,
    wei(ethers.utils.parseEther(sizeInEther)),
    fillPrice
  )
  logObject('Submit order: ', submitOrder)
}

async function getFuturePositions(ethMarket: FuturesMarket): Promise<FuturesPosition[]> {
  const futurePositions = await sdk.futures.getFuturesPositions(w, [
    {
      asset: ethMarket?.asset!,
      marketKey: ethMarket?.marketKey!,
      address: ethMarket?.market!
    }
  ])
  futurePositions.forEach((p) => {
    logObject('Future position: ', p)
    if (p.position) {
      logObject('Inside Position: ', p.position)
    }
  })
  return futurePositions
}

async function crossMargin() {
  const markets = await sdk.futures.getMarkets()
  const ethMarket = markets.find((market) => market.asset === 'sETH')
  console.log('Eth market key: ', ethMarket?.marketKey)

  const marginAccounts = await sdk.futures.getCrossMarginAccounts(w)
  console.log('Margin accounts: ', marginAccounts)

  const crossMarginbalance = await sdk.futures.getCrossMarginAccountBalance(marginAccounts[0])
  console.log('Cross margin balance: ', crossMarginbalance.toString())

  const crossMarginbalanceInfo = await sdk.futures.getCrossMarginBalanceInfo(w, marginAccounts[0])
  logObject('Cross margin balance info: ', crossMarginbalanceInfo)

  const crossMarginKeeperBalance = await sdk.futures.getCrossMarginKeeperBalance(marginAccounts[0])
  console.log('Cross margin keeper balance: ', crossMarginKeeperBalance.toString())

  // const positionHistory = await sdk.futures.getPositionHistory(
  //   w1
  // );
  // logObject("Position history: ", positionHistory);

  const idleMargin = await sdk.futures.getIdleMargin(w, marginAccounts[0])
  logObject('Idle margin: ', idleMargin)
  console.log('Markets with margin: ', idleMargin.marketsWithMargin)
  logObject('Position: ', idleMargin.marketsWithMargin[0].position)

  const idleMarginMarkets = await sdk.futures.getIdleMarginInMarkets(marginAccounts[0])
  logObject('Idle margin in markets: ', idleMarginMarkets)
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

async function synService() {
  startHermesStreaming()
  startStreaming()
  await delay(1000)
  const ss = new SynthetixV2Service()

  // const tradeHistory = await ss.getTradesHistory(
  //   // "0x4dBc24BEb46fC22CD2322a9fF9e5A99CE0F0c3Eb",
  //   // "0xd344b73Ac42e34bC8009d522657adE4346B72c9D",
  //   // "0x98F1b4C9Fe6CCC9d5892650569f9A801A4AdcE54",
  //   "0xf5433b068A87141C5e214931288942B2Ceb212b0",
  //   undefined
  // );
  // tradeHistory.forEach((t) => {
  //   logObject("Trade History: ", t);
  // });

  // const liquidationsHistory = (
  //   await ss.getLiquidationsHistory('0x6F8f75930de3ECB4e6b6e745d5E14B1478D282CA', undefined, undefined)
  // ).result
  // liquidationsHistory.forEach((t) => {
  //   logObject('Liq History: ', t)
  //   console.log('Liquidation Lev: ', formatAmount(t.liqudationLeverage.value, t.liqudationLeverage.decimals))
  // })

  // for (let i = 0; i < 10; i++) {
  //   console.time("Idle margin" + i);
  //   await sdk.futures.getIdleMarginInMarkets(w);
  //   console.timeEnd("Idle margin" + i);
  // }

  // const order = await ss.getOrder(w, "sETHPERP");
  // logObject("Order: ", order);

  // const allOrders = await ss.getAllOrders(w);
  // allOrders.forEach((o) => logObject("All Orders: ", o));

  const supportedNetworks = ss.supportedNetworks()
  // logObject("Supported Networks: ", supportedNetworks[0]);

  const supportedMarkets = await ss.supportedMarkets(supportedNetworks[0])
  // const pepeMarket = supportedMarkets.find(
  //     (m) => m.indexOrIdentifier === FuturesMarketKey.sPEPEPERP
  //   )!;
  // console.dir({ pepeMarket }, { depth: 4 })
  // const btcMarket = supportedMarkets.find(
  //   (m) => m.indexOrIdentifier === FuturesMarketKey.sBTCPERP
  // )!;
  // const btcPrice = await ss.getMarketPrice(btcMarket);
  // const dynamicMetadata = await ss.getDynamicMetadata(btcMarket);
  // logObject("Dynamic Metadata: ", dynamicMetadata);

  // console.log("BTC Price: ", ethers.utils.formatUnits(btcPrice.value, 18));
  // logObject("Supported Markets: ", supportedMarkets[0]);
  // for (const market of supportedMarkets) {
  //   try {
  //     let price = await ss.getMarketPrice(market);
  //     console.log(
  //       "Asset: ",
  //       market.asset,
  //       "Price: ",
  //       ethers.utils.formatUnits(price.value, 18)
  //     );
  //   } catch (e) {
  //     console.log("Asset: ", market.asset, "Error: ", e);
  //   }
  // }

  // (await sdk.futures.getMarkets()).forEach(async (market) => {
  //   let price = await sdk.futures.getAssetPrice(market.market);
  //   console.log("Market: ", market.marketKey, "Price: ", price.toString());
  // });

  // let futurePositions = await sdk.futures.getFuturesPositions(w, [
  //   {
  //     asset: FuturesMarketAsset.sBTC,
  //     marketKey: FuturesMarketKey.sBTCPERP,
  //     address: supportedMarkets.find(
  //       (m) => m.indexOrIdentifier === FuturesMarketKey.sBTCPERP
  //     )!.address!,
  //   },
  // ]);
  // console.log("Future positions: ", futurePositions.length);
  // futurePositions.forEach((p) => {
  //   logObject("Future position: ", p);
  //   if (p.position) logObject("Inside Position: ", p.position);
  // });

  // let position = await ss.getPosition("sBTCPERP", w);
  // logObject("Position: ", position);

  // await ss.getAllPositions(w, provider, undefined);

  // const transferMarginTx = await createTransferMarginOrder(ss, "50");
  // await fireTx(transferMarginTx);

  // for (let i = 0; i < supportedMarkets.length; i++) {
  //   if (supportedMarkets[i].indexOrIdentifier == "sETHPERP") {
  //     let dynamicMetadata = await ss.getDynamicMetadata(supportedMarkets[i]);
  //     logObject(
  //       supportedMarkets[i].indexOrIdentifier + " Dynamic Metadata: ",
  //       dynamicMetadata
  //     );
  //   }
  // }

  const sizeDelta = '0.05'
  const direction = 'LONG'
  const marketAddress = '0x2b3bb4c683bfc5239b029131eef3b1d214478d93'

  // const margins = await ss.getIdleMargins('0x2f88a09ed4174750a464576FE49E586F90A34820', undefined)
  // console.dir({ margins }, { depth: 4 })

  // const openMarkets = await compositeService();
  // const futureMarkets = await ss.getPartialFutureMarketsFromOpenMarkets(
  //   openMarkets
  // );
  // const ethFutureMarket = futureMarkets.find((m) => m.marketKey == "sETHPERP")!;

  // const result = await ss.getAvailableSusdBalance("0x89E369321619114e317a3121A2693f39728f51f1", openMarkets)
  // console.log("Available Susd Balance: ", result.toString())

  // for (let i = 0; i < 10; i++) {
  //   console.time("getSimulatedIsolatedTradePreview");
  //   const result1 = await sdk.futures.getIdleMarginInMarketsCached(
  //     "0x89E369321619114e317a3121A2693f39728f51f1",
  //     [ethFutureMarket]
  //   );
  //   console.timeEnd("getSimulatedIsolatedTradePreview");
  //   console.log(result1.totalIdleInMarkets.toString());
  // }

  // const positionsHistory = await sdk.futures.getCompletePositionHistory(w);
  // console.log("Position History: ", positionsHistory.length);
  // positionsHistory.forEach((p) => {
  //   logObject("Position History: ", p);
  // });

  // const tradesHistory = await ss.getTradesHistory(w, undefined);
  // console.log("Trades History: ", tradesHistory.length);
  // tradesHistory.slice(0, 10).forEach((t) => {
  //   logObject("Trades History: ", t);
  // });

  // console.log('Synthetix')
  // for (let i = 0; i < 10; i++) {
  //   const positions = (
  //     await ss.getAllPositions('0xD81c12559fBfC78841bBFF3618eaB880646847BA', provider, undefined, undefined)
  //   ).result
  // }
  // positions.forEach((p) => logObject("Position: ", p));
  // logObject('Position: ', positions[0])

  // for (let i = 0; i < 10; i++) {
  //   console.time('closeTradePreview')
  //   const closeTradePreview = await ss.getCloseTradePreview(
  //     '0x2f88a09ed4174750a464576FE49E586F90A34820',
  //     provider,
  //     positions[0],
  //     positions[0].size.mul(40).div(100),
  //     false,
  //     undefined,
  //     undefined,
  //     undefined
  //   )
  //   console.timeEnd('closeTradePreview')
  //   // logObject('Close Trade Preview: ', closeTradePreview)
  // }

  // for (let i = 0; i < 10; i++) {
  //   console.time('getEditCollateralPreview')
  //   const editTradePreview = await ss.getEditCollateralPreview(
  //     '0xD81c12559fBfC78841bBFF3618eaB880646847BA',
  //     provider,
  //     positions[0],
  //     ethers.utils.parseEther('10'),
  //     false
  //   )
  //   console.timeEnd('getEditCollateralPreview')
  //   // logObject('Edit Trade Preview: ', editTradePreview)
  // }

  // const closePositionTxs = await ss.closePosition(
  //   provider,
  //   positions[0],
  //   positions[0].size.mul(100).div(100),
  //   false,
  //   undefined,
  //   undefined,
  //   undefined
  // );
  // closePositionTxs.forEach((tx) => {
  //   logObject("Close position tx: ", tx);
  // });
  // await fireTxs(closePositionTxs);

  // const updatePosMarginTxs = await ss.updatePositionMargin(
  //   provider,
  //   positions[0],
  //   ethers.utils.parseUnits("10"),
  //   true
  // );
  // updatePosMarginTxs.forEach((tx) => {
  //   logObject("Update position margin tx: ", tx);
  // });
  // await fireTxs(updatePosMarginTxs);

  // let withdrawTxs = await ss.withdrawUnusedCollateral();

  // const fillPrice = await sdk.futures.getFillPrice(
  //   marketAddress,
  //   direction.includes("SHORT") ? wei(sizeDelta).neg() : wei(sizeDelta)
  // );

  // const fillPriceBn = direction.includes("SHORT")
  //   ? fillPrice.price.mul(99).div(100)
  //   : fillPrice.price.mul(101).div(100);
  // console.log("Fill Price: ", fillPriceBn.toString());

  // for (let i = 0; i < 10; i++) {
  //   console.time("getSimulatedIsolatedTradePreview");
  //   await sdk.futures.getSimulatedIsolatedTradePreview(
  //     w,
  //     FuturesMarketKey.sETHPERP,
  //     marketAddress,
  //     {
  //       sizeDelta: wei(ethers.utils.parseEther(sizeDelta)),
  //       marginDelta: wei(0),
  //       orderPrice: wei(fillPriceBn),
  //     }
  //   );
  //   console.timeEnd("getSimulatedIsolatedTradePreview");
  //   console.log("\n\n\n");
  // }

  const ethMarket = supportedMarkets.find((m) => m.indexOrIdentifier === FuturesMarketKey.sETHPERP)!

  for (let i = 0; i < 1; i++) {
    const marketPrice = BigNumber.from((await ss.getMarketPrice(ethMarket))!.value)
    // await delay(100)
    // console.time('getTradePreview')
    const tradePreview = await getTradePreview(
      '0x2f88a09ed4174750a464576FE49E586F90A34820',
      ss,
      sizeDelta,
      '50.86',
      direction,
      // ethers.utils.parseUnits('2109', 18),
      marketPrice,
      ethMarket
    )
    // console.timeEnd('getTradePreview')
    console.log('\n')
    // console.dir({ tradePreview }, { depth: 4 })
    logObject('Trade Preview: ', tradePreview)
    logObject('PriceImpact: ', tradePreview.priceImpact)
  }

  // if (tradePreview.status == 0) {
  //   const triggerPrice = direction.includes("SHORT")
  //     ? tradePreview.averageEntryPrice!.mul(99).div(100)
  //     : tradePreview.averageEntryPrice!.mul(101).div(100);
  //   console.log("Trigger Price: ", triggerPrice.toString());

  //   const createLongOrderTxs = await createLongOrder(
  //     ss,
  //     sizeDelta,
  //     direction,
  //     triggerPrice,
  //     "50"
  //   );
  //   createLongOrderTxs.forEach((tx) => {
  //     logObject("Tx: ", tx);
  //   });
  //   //await fireTxs(createLongOrderTxs);
  // } else {
  //   console.log("Trade Will Fail".toUpperCase());
  // }

  // let ethPrice = await sdk.futures.getAssetPrice(marketAddress);
  // console.log("ETH Price: ", ethPrice.toBN());
  // console.log("ETH Price: ", ethPrice.toString());

  // const idleMargins = await getIdleMargins(ss);
  // const withdrawableEthMargin = idleMargins.filter((m) => m.indexOrIdentifier == "sETHPERP")[0].inputCollateralAmount.mul(-1)
  // console.log("Withdrawable ETH Margin: ", withdrawableEthMargin.toString());
  // const withdrawEthMarginTx = await createTransferMarginOrder(
  //   ss,
  //   withdrawableEthMargin
  // )
  // await fireTx(withdrawEthMarginTx)

  // await getTradePreview(ss);

  // const pHistory = await sdk.futures.getPositionHistory(w);
  // pHistory.forEach((pHistory) => {
  //   logObject("Position History: ", pHistory);
  // });

  // const cpHistory = await sdk.futures.getCompletePositionHistory(w);
  // cpHistory.forEach((cpHistory) => {
  //   logObject("Complete Position History: ", cpHistory);
  // });

  // const ethTrades = await sdk.futures.getTradesForMarket(
  //   FuturesMarketAsset.sETH,
  //   w,
  //   "isolated_margin"
  // );
  // ethTrades.forEach((ethTrades) => {
  //   logObject("ETH Trades: ", ethTrades);
  // });

  // const createLongOrderTx = await createLongOrder(ss);
  // const cancelOrderTx = await cancelDelayedOffChainOrder(ss);

  // let result = await sdk.futures.getIdleMarginInMarkets(
  //   "0xd0dF6C42c4DAadB33fbD14930b670Bed4c9577d1"
  // );
  // logObject("Idle Margin in Markets: ", result);
  // result.marketsWithIdleMargin.forEach((m) => {
  //   logObject("Market: ", m);
  //   if (m.position) logObject("Position: ", m.position);
  // });
}

async function gmxService() {
  // const provider = new ethers.providers.AlchemyProvider(
  //   42161,
  //   ALCHEMY_KEY_OP_MAIN!.toString()
  // );
  // const provider = new ethers.providers.JsonRpcProvider(
  //   'https://arbitrum.blockpi.network/v1/rpc/6bee49eb5c39a712464e8f39182ff12127c84f48',
  //   // "https://rpc.ankr.com/arbitrum",
  //   ARBITRUM
  // )
  const provider = rpc[ARBITRUM]

  const signer = new ethers.Wallet(wpk, provider)
  const gs = new GmxV1Service()

  // const allOrders = (await gs.getAllOrders(w, provider, undefined, undefined)).result

  // for (const order of allOrders) {
  //   const cancelOrderTx = await gs.cancelOrder(provider, undefined, order)
  //   logObject('Cancel Order Tx: ', cancelOrderTx[0].tx)
  // }

  // allOrders.forEach((o) => {
  //   logObject('Order: ', o)
  //   // logObject('Trigger: ', o.trigger!)
  // })

  let supportedMarkets = await gs.supportedMarkets(gs.supportedNetworks()[0])
  // console.dir({ supportedMarkets }, { depth: 2 })

  // let btcMarket = supportedMarkets.find(
  //   (m) => m.indexOrIdentifier.toLowerCase() === '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'.toLowerCase() //BTC market
  // )!
  // let ethMarket = supportedMarkets.find(
  //   (m) => m.indexOrIdentifier.toLowerCase() === '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'.toLowerCase() //ETH market
  // )!

  // const dynamicMetadata = await gs.getDynamicMetadata(btcMarket, provider)
  // logObject('Dynamic Metadata: ', dynamicMetadata)

  // const tradeHistory = await gs.getTradesHistory(
  //   // "0xC41427A0B49eB775E022E676F0412B12df1193a5",
  //   // "0xe4718282022518A2499dD73Fc767654095F198A5",
  //   // '0xd344b73Ac42e34bC8009d522657adE4346B72c9D',
  //   // "0x98F1b4C9Fe6CCC9d5892650569f9A801A4AdcE54",
  //   // "0xf5433b068A87141C5e214931288942B2Ceb212b0",
  //   '0x2f88a09ed4174750a464576FE49E586F90A34820',
  //   undefined,
  //   {
  //     limit: 3,
  //     skip: 0
  //   }
  // )

  // console.dir({ tradeHistory }, { depth: 4 })
  // tradeHistory.forEach((t) => {
  //   logObject("Trade History: ", t);
  // });
  // console.log("Trade History To ", tradeHistory[0]);
  // console.log("Trade History From ", tradeHistory[tradeHistory.length - 1]);

  // const liquidationsHistory = await gs.getLiquidationsHistory(
  //   "0xC41427A0B49eB775E022E676F0412B12df1193a5",
  //   undefined
  // );
  // console.dir({ liquidationsHistory }, { depth: 4 });
  // logObject("Liquidations History: ", liquidationsHistory[0]);

  // supportedMarkets.forEach((m) => {
  //   logObject("Supported Market: ", m);
  // });

  // supportedMarkets[0].longCollateral.forEach((c) => {
  //   console.log("Long Collateral: ", c.symbol);
  // });
  // console.time("Get Market Price");
  // const price = await gs.getMarketPrice(supportedMarkets[0]);
  // logObject("Price: ", price);
  // console.timeEnd("Get Market Price");

  // let position0 = (await gs.getAllPositions(w, signer))[0];
  // logObject("Ext Pos: ", position0);
  // let position1 = (await gs.getAllPositions(w, signer))[1];
  // logObject("Ext Pos: ", position1);

  // await gs.getAllOrders(w, provider);

  // const orders = await gs.getAccountOrders(w, provider);
  // orders!.forEach((o) => {
  //   logObject("Order: ", o);
  // });

  // const expandedOrders = await gs.getAllOrders(w, provider);
  // expandedOrders.forEach((o) => {
  //   logObject("Expanded Order: ", o);
  //   logObject("Trigger", o.trigger!);
  // });

  // const btcToken = {
  //   name: "Bitcoin (WBTC)",
  //   symbol: "BTC",
  //   decimals: "8",
  //   address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
  //   isShortable: true,
  //   imageUrl:
  //     "https://assets.coingecko.com/coins/images/26115/thumb/btcb.png?1655921693",
  //   coingeckoUrl: "https://www.coingecko.com/en/coins/wrapped-bitcoin",
  //   explorerUrl:
  //     "https://arbiscan.io/address/0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
  //   isV1Available: true,
  // };
  // const nativeETH = {
  //   name: "Ethereum",
  //   symbol: "ETH",
  //   decimals: "18",
  //   address: ethers.constants.AddressZero,
  //   isNative: true,
  //   isShortable: true,
  //   imageUrl:
  //     "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
  //   coingeckoUrl: "https://www.coingecko.com/en/coins/ethereum",
  //   isV1Available: true,
  // };
  // const usdcEToken = {
  //   name: "Bridged USDC (USDC.e)",
  //   symbol: "USDC.e",
  //   decimals: "6",
  //   address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
  //   isStable: true,
  //   imageUrl:
  //     "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
  //   coingeckoUrl: "https://www.coingecko.com/en/coins/usd-coin",
  //   explorerUrl:
  //     "https://arbiscan.io/token/0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
  //   isV1Available: true,
  // };

  // let inToken = nativeETH;

  let usdce = {
    name: 'Bridged USDC (USDC.e)',
    symbol: 'USDC.e',
    decimals: '6',
    address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
  }

  let usdc = {
    name: 'USDC',
    symbol: 'USDC',
    decimals: '6',
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
  }

  let eth = {
    name: 'ETH',
    symbol: 'ETH',
    decimals: '18',
    address: ethers.constants.AddressZero
  }

  console.log('LEGACY')
  for (let i = 0; i < 5; i++) {
    console.time('getAllPositions')
    const allPositions = (await gs.getAllPositions(w, provider, undefined, undefined)).result
    // allPositions.forEach((p, index) => {
    //   console.log('Position: ', index)
    //   for (const key in p) {
    //     const value = p[key as keyof ExtendedPosition]
    //     console.log(key, '=>', value)
    //   }
    //   console.log('----------------\n')
    // })
    console.timeEnd('getAllPositions')
  }
  // for (let i = 0; i < allPositions.length; i++) {
  //   logObject('Position: ', allPositions[i])
  //   // let positionOrders = await gs.getAllOrdersForPosition(w, provider, allPositions[i], undefined)
  //   // positionOrders.forEach((o) => {
  //   //   logObject('Position Order: ', o)
  //   // })
  // }

  // let position0 = allPositions.length > 0 ? allPositions[0] : undefined
  // console.log(position0 ? 'Position 0: ' : 'No position 0')
  let market = supportedMarkets.find(
    (m) => m.indexOrIdentifier.toLowerCase() === '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'.toLowerCase() //BTC market
  )!

  let linkMarket = supportedMarkets.find(
    (m) => m.indexOrIdentifier.toLowerCase() === '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4'.toLowerCase() //LINK market
  )!

  // console.dir({ position0 }, { depth: 4 })

  // let updateMarginTx = await gs.updatePositionMargin(
  //   provider,
  //   position0!,
  //   // ethers.utils.parseUnits('0.001', position0!.collateralToken.decimals),
  //   ethers.utils.parseUnits('5', 30),
  //   false,
  //   eth
  //   // position0!.collateralToken
  // )
  // updateMarginTx.forEach((tx) => {
  //   logObject('Update margin tx: ', tx.tx)
  // })
  // await fireTxs(updateMarginTx);

  // console.log({ market })
  // for (let i = 0; i < 1; i++) {
  //   // console.time('tradePreview')
  //   const tradePreview = await gs.getTradePreview(
  //     w,
  //     provider,
  //     linkMarket,
  //     {
  //       type: 'MARKET_INCREASE',
  //       direction: 'SHORT',
  //       inputCollateral: eth,
  //       inputCollateralAmount: ethers.utils.parseUnits('1', eth.decimals),
  //       sizeDelta: ethers.utils.parseUnits('52000', 30),
  //       isTriggerOrder: false,
  //       referralCode: undefined,
  //       trigger: {
  //         triggerPrice: BigNumber.from((await gs.getMarketPrice(market)).value),
  //         // triggerPrice: ethers.utils.parseUnits("37371", 30),
  //         triggerAboveThreshold: false
  //       },
  //       slippage: '1'
  //     },
  //     undefined,
  //     // undefined,
  //     {
  //       bypassCache: true,
  //       overrideStaleTime: 5 * 1000
  //     }
  //   )
  //   // console.timeEnd('tradePreview')
  //   logObject('Trade Preview: ', tradePreview)
  // }

  // for (let i = 0; i < 1; i++) {
  //   // console.time('getCloseTradePreview')
  //   const closePreview = await gs.getCloseTradePreview(
  //     w,
  //     provider,
  //     position0!,
  //     position0!.size.mul(10).div(100),
  //     true,
  //     ethers.utils.parseUnits('40000', 30),
  //     true,
  //     usdc
  //   )
  //   // console.timeEnd('getCloseTradePreview')
  //   logObject('Close Preview: ', closePreview)
  // }

  // for (let i = 0; i < 1; i++) {
  //   // console.time('getEditCollateralPreview')
  //   const editCollateralPreview = await gs.getEditCollateralPreview(
  //     w,
  //     provider,
  //     position0!,
  //     // ethers.utils.parseUnits("0", 30),
  //     ethers.utils.parseUnits('0.00005', position0!.collateralToken!.decimals),
  //     true,
  //     {
  //       bypassCache: true,
  //       overrideStaleTime: 1000
  //     }
  //   )
  //   // console.timeEnd('getEditCollateralPreview')
  //   logObject('editCollateralPreview: ', editCollateralPreview)
  // }

  // let closePositionTxs = await gs.closePosition(
  //   provider,
  //   allPositions[0],
  //   allPositions[0].size.mul(50).div(100),
  //   // ethers.utils.parseUnits("10", 30),
  //   true,
  //   ethers.utils.parseUnits("125936", 30),
  //   true,
  //   usdc
  // );
  // closePositionTxs.forEach((tx) => {
  //   logObject("Close position tx: ", tx.tx);
  // });
  // await fireTxs(closePositionTxs);

  // let triggerClosePositionTxs = await gs.closePosition(
  //   provider,
  //   allPositions[0],
  //   allPositions[0].size.mul(75).div(100),
  //   // ethers.utils.parseUnits("10", 30),
  //   true,
  //   ethers.utils.parseUnits("20000", 30),
  //   false,
  //   eth
  // );
  // triggerClosePositionTxs.forEach((tx) => {
  //   logObject("TriggerClose position tx: ", tx);
  // });
  // await fireTxs(triggerClosePositionTxs);

  // await gs.setup(provider);
  // console.log("Finished Setup".toUpperCase());

  // const txs = await gs.createOrder(provider, market, {
  //   type: 'LIMIT_INCREASE',
  //   direction: 'LONG',
  //   inputCollateral: eth,
  //   inputCollateralAmount: ethers.utils.parseUnits('0.014', eth.decimals),
  //   sizeDelta: ethers.utils.parseUnits('52', 30),
  //   isTriggerOrder: false,
  //   referralCode: undefined,
  //   trigger: {
  //     // triggerPrice: BigNumber.from((await gs.getMarketPrice(market)).value),
  //     triggerPrice: ethers.utils.parseUnits('30000', 30),
  //     triggerAboveThreshold: false
  //   },
  //   slippage: '1'
  // })
  // console.dir({ txs }, { depth: 4 })

  // const positions = await gs.getAllPositions(w, provider);
  // positions.forEach((p) => {
  //   logObject("Position: ", p);
  // });

  // const mtdt = await gs.getDynamicMetadata(supportedMarkets[0], provider);
  // console.log(mtdt);
}

async function compositeService() {
  const ss = new SynthetixV2Service()
  const gs = new GmxV1Service()

  const cs = new CompositeService(ss, gs)

  let openMarkets = await cs.getOpenMarkets()
  console.dir(openMarkets['ETH/USD'], { depth: 10 })
  return openMarkets
}

async function testService() {
  let b1 = parseUnits('1.1', 4)

  console.log(b1.toString())
}

// synService()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exitCode = 1;
//   });

async function testAutoRouter() {
  // synthetix initial setup
  const ss = new SynthetixV2Service()
  const supportedNetworks = ss.supportedNetworks()
  // logObject("Supported Networks: ", supportedNetworks[0]);

  const synSupportedMarkets = await ss.supportedMarkets(supportedNetworks[0])
  const synBtcMarket = synSupportedMarkets.find((m) => m.indexOrIdentifier === FuturesMarketKey.sBTCPERP)!
  let synProvider = new ethers.providers.JsonRpcProvider(
    'https://optimism.blockpi.network/v1/rpc/e9eb838be05076b18bceb9e7efe3797c93bed264',
    10
  )

  // gmx initial setup
  const gmxProvider = new ethers.providers.JsonRpcProvider(
    'https://arbitrum.blockpi.network/v1/rpc/6bee49eb5c39a712464e8f39182ff12127c84f48',
    // "https://rpc.ankr.com/arbitrum",
    ARBITRUM
  )
  const signer = new ethers.Wallet(wpk, gmxProvider)
  const gs = new GmxV1Service()
  let gmxSupportedMarkets = await gs.supportedMarkets(gs.supportedNetworks()[0])
  const gmxBtcMarket = gmxSupportedMarkets.find(
    (m) => m.indexOrIdentifier.toLowerCase() === '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'.toLowerCase() //BTC market
  )!
  let usdce = {
    name: 'Bridged USDC (USDC.e)',
    symbol: 'USDC.e',
    decimals: '6',
    address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
  }

  type Scenario = {
    collateralUsd: string
    lev: string
  }

  let collateralAmounts = ['1000', '10000', '100000']
  let levs = ['5', '10']

  let scenarios: Scenario[] = []
  for (let i = 0; i < collateralAmounts.length; i++) {
    for (let j = 0; j < levs.length; j++) {
      scenarios.push({
        collateralUsd: collateralAmounts[i],
        lev: levs[j]
      })
    }
  }

  // compare get trade preview for various position sizes for gs and ss
  for (let i = 0; i < scenarios.length; i++) {
    console.log('\nScenario', i + 1, ': (Margin: ', scenarios[i].collateralUsd, ', Lev: ', scenarios[i].lev, ')')

    const PRECISION = BigNumber.from(10).pow(50)
    let margin = scenarios[i].collateralUsd
    let lev = scenarios[i].lev
    let sizeDeltaUsd = BigNumber.from(margin).mul(lev)
    let gmxSizeDelta = ethers.utils.parseUnits(sizeDeltaUsd.toString(), 30)
    let synScale = BigNumber.from(10).pow(18)
    let gmxScale = BigNumber.from(10).pow(30)
    const gmxMarketPrice = BigNumber.from((await gs.getMarketPrice(gmxBtcMarket)).value)
    // console.log("gmx Market Price: ", formatUnits(gmxMarketPrice, 30));
    const synMarketPrice = BigNumber.from(
      //TODO: handle undefined price
      //@ts-ignore
      (await ss.getMarketPrice(synBtcMarket)).value
    )
    // console.log("syn Market Price: ", formatUnits(synMarketPrice, 18));

    let synSizeDelta = sizeDeltaUsd.mul(synScale).mul(synScale).div(synMarketPrice)
    // console.log("synSizeDelta", synSizeDelta.toString());

    let direction: OrderDirection = 'LONG'

    const previews = await Promise.all([
      gs.getTradePreview(
        w,
        gmxProvider,
        gmxBtcMarket,
        {
          type: 'MARKET_INCREASE',
          direction: direction,
          inputCollateral: usdce,
          inputCollateralAmount: ethers.utils.parseUnits(margin, usdce.decimals),
          sizeDelta: gmxSizeDelta,
          isTriggerOrder: false,
          referralCode: undefined,
          trigger: {
            triggerPrice: gmxMarketPrice,
            triggerAboveThreshold: false
          },
          slippage: '1'
        },
        undefined
      ),
      ss.getTradePreview(
        w,
        synProvider,
        synBtcMarket,
        {
          type: 'MARKET_INCREASE',
          direction: direction,
          inputCollateral: {
            name: 'string',
            symbol: 'string',
            decimals: 'string',
            address: 'string'
          },
          inputCollateralAmount: ethers.utils.parseUnits(margin, 18),
          sizeDelta: synSizeDelta,
          isTriggerOrder: false,
          referralCode: undefined,
          trigger: {
            triggerPrice: synMarketPrice,
            triggerAboveThreshold: true
          },
          slippage: '1'
        },
        undefined,
        //TODO: handle undefined price
        //@ts-ignore
        synMarketPrice
      )
    ])

    const gmxTP = previews[0]
    // logObject("gmx TP: ", gmxTP);
    const synTP = previews[1]
    // logObject("syn TP: ", synTP);

    const synMAF = ethers.utils.parseUnits(margin, 18).sub(synTP.fee!)
    // console.log("syn MAF: ", formatUnits(synMAF.toString(), 18));
    // console.log("synSizeDelta: ", formatUnits(synSizeDelta.toString(), 18));
    const synEP = synMAF.mul(lev).mul(PRECISION).div(synSizeDelta)

    // console.log("gmxSizeDelta: ", formatUnits(gmxSizeDelta, 30));
    const gmxSize = gmxSizeDelta.mul(gmxScale).div(gmxMarketPrice)
    // console.log("gmxSize: ", formatUnits(gmxSize, 50));
    const gmxMAF = ethers.utils.parseUnits(margin, 30).sub(gmxTP.fee!)
    // console.log("gmx MAF: ", formatUnits(gmxMAF.toString(), 30));

    const gmxEP = gmxMAF.mul(lev).mul(PRECISION).div(gmxSize)

    console.log(
      'Syn Stats:',
      '\nMarket Price=>',
      formatUnits(synMarketPrice, 18),
      '\nEntry Price=>',
      formatUnits(synTP.averageEntryPrice, 18),
      '\nFees=>',
      formatUnits(synTP.fee!, 18),
      '\nSize=>',
      formatUnits(synTP.size, 18)
    )
    console.log(
      'Gmx Stats:',
      '\nMarket Price=>',
      formatUnits(gmxMarketPrice, 30),
      '\nEntry Price=>',
      formatUnits(gmxTP.averageEntryPrice, 30),
      '\nFees=>',
      formatUnits(gmxTP.fee!, 30),
      '\nSize=>',
      formatUnits(gmxSize, 30)
    )
    console.log('synEP: ', formatUnits(synEP, 50))
    console.log('gmxEP: ', formatUnits(gmxEP, 50))
  }
}

async function testPrice() {
  await delay(4000)

  for (let i = 0; i < 1000; i++) {
    const price = getTokenPriceD('BTC', 18)
    console.log('Price: ', formatUnits((price || 0).toString(), 18))
    await delay(1000)
  }
}

// async function priceWS() {
//   const PYTHNET_CLUSTER_NAME: PythCluster = "pythnet";
//   const connection = new Connection(getPythClusterApiUrl(PYTHNET_CLUSTER_NAME));
//   const pythPublicKey = getPythProgramKeyForCluster(PYTHNET_CLUSTER_NAME);

//   const pythConnection = new PythConnection(connection, pythPublicKey);
//   pythConnection.onPriceChangeVerbose((productAccount, priceAccount) => {
//     // The arguments to the callback include solana account information / the update slot if you need it.
//     const product = productAccount.accountInfo.data.product;
//     const price = priceAccount.accountInfo.data;
//     // sample output:
//     // SOL/USD: $14.627930000000001 ±$0.01551797
//     if (price.price && price.confidence) {
//       // tslint:disable-next-line:no-console
//       console.log(
//         `${product.symbol}: $${price.price} \xB1$${price.confidence}`
//       );
//     } else {
//       // tslint:disable-next-line:no-console
//       console.log(
//         `${product.symbol}: price currently unavailable. status is ${
//           PriceStatus[price.status]
//         }`
//       );
//     }
//   });

//   // tslint:disable-next-line:no-console
//   console.log("Reading from Pyth price feed...");
//   pythConnection.start();
// }

// startStreaming()

synService()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
  })
