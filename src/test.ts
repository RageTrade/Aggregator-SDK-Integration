import KwentaSDK from "@kwenta/sdk";
import {
  BigNumber,
  ethers,
  Signer,
  BigNumberish,
  UnsignedTransaction,
  Transaction,
} from "ethers";
import { config } from "dotenv";
import {
  ContractOrderType,
  FuturesMarket,
  FuturesMarketAsset,
  FuturesPosition,
  PositionSide,
} from "@kwenta/sdk/dist/types";
import Wei, { wei } from "@synthetixio/wei";
import SynthetixV2Service from "./exchanges/synthetixv2";
import { Mode, OrderType } from "./interface";
import GmxV1Service from "./exchanges/gmxv1";
import { getTokenBySymbol } from "./configs/gmx/tokens";
import { ARBITRUM } from "./configs/gmx/chains";
import CompositeService from "./common/compositeService";
import { FuturesMarketKey } from "@kwenta/sdk/dist/types/futures";
import { logObject } from "./common/helper";

config();

const { ALCHEMY_KEY_OP_MAIN, PRIVATE_KEY, W2, PRIVATE_KEY2, W1, PRIVATE_KEY1 } =
  process.env;

const w = W1!.toString();
const wpk = PRIVATE_KEY1!.toString();

let provider = new ethers.providers.AlchemyProvider(
  10,
  ALCHEMY_KEY_OP_MAIN!.toString()
);

const signer = new ethers.Wallet(wpk, provider);

const sdk = new KwentaSDK({
  networkId: 10,
  provider: provider,
});

async function fireTxs(utxs: UnsignedTransaction[]) {
  for (let i = 0; i < utxs.length; i++) {
    await fireTx(utxs[i]);
  }
}

async function fireTx(utx: UnsignedTransaction) {
  const tx = await signer.sendTransaction(
    utx as ethers.providers.TransactionRequest
  );
  console.log("Transaction: ", tx.hash);
  await tx.wait(10);

  return tx;
}

async function getTradePreview(
  user: string,
  ss: SynthetixV2Service,
  sizeDelta: string,
  direction: "LONG" | "SHORT",
  triggerPrice: BigNumber
) {
  const tradePreview = await ss.getTradePreview(
    user,
    signer,
    {
      mode: "ASYNC",
      longCollateral: [],
      shortCollateral: [],
      indexOrIdentifier: "sETHPERP",
      supportedOrderTypes: {
        LIMIT_DECREASE: true,
        LIMIT_INCREASE: true,
        MARKET_INCREASE: true,
        MARKET_DECREASE: true,
        DEPOSIT: true,
        WITHDRAW: true,
      },
    },
    {
      type: direction == "LONG" ? "MARKET_INCREASE" : "MARKET_DECREASE",
      direction: direction,
      inputCollateral: {
        name: "string",
        symbol: "string",
        decimals: "string",
        address: "string",
      },
      inputCollateralAmount: ethers.utils.parseUnits("60"),
      sizeDelta: ethers.utils.parseEther(sizeDelta),
      isTriggerOrder: false,
      referralCode: undefined,
      trigger: {
        triggerPrice: triggerPrice,
        triggerAboveThreshold: true,
      },
    }
  );
  logObject("Trade Preview: ", tradePreview);
  return tradePreview;
}

async function createLongOrder(
  ss: SynthetixV2Service,
  sizeDelta: string,
  direction: "LONG" | "SHORT",
  triggerPrice: BigNumber,
  inputCollateral: string
): Promise<UnsignedTransaction[]> {
  const createOrderTxs = await ss.createOrder(
    signer,
    {
      mode: "ASYNC",
      longCollateral: [],
      shortCollateral: [],
      indexOrIdentifier: "sETHPERP",
      supportedOrderTypes: {
        LIMIT_DECREASE: true,
        LIMIT_INCREASE: true,
        MARKET_INCREASE: true,
        MARKET_DECREASE: true,
        DEPOSIT: true,
        WITHDRAW: true,
      },
    },
    {
      type: direction == "LONG" ? "MARKET_INCREASE" : "MARKET_DECREASE",
      direction: direction,
      inputCollateral: {
        name: "string",
        symbol: "string",
        decimals: "string",
        address: "string",
      },
      inputCollateralAmount: ethers.utils.parseUnits(inputCollateral),
      sizeDelta: ethers.utils.parseEther(sizeDelta),
      isTriggerOrder: false,
      referralCode: undefined,
      trigger: {
        triggerPrice: triggerPrice,
        triggerAboveThreshold: true,
      },
    }
  );

  return createOrderTxs;
}

async function getIdleMargins(ss: SynthetixV2Service) {
  const idleMargins = await ss.getIdleMargins(w);
  idleMargins.forEach((idleMargin) => {
    logObject("Idle Margin: ", idleMargin);
  });
  return idleMargins;
}

async function cancelDelayedOffChainOrder(
  ss: SynthetixV2Service
): Promise<UnsignedTransaction[]> {
  const cancelOrder = await ss.cancelOrder(
    signer,
    {
      mode: "ASYNC",
      longCollateral: [],
      shortCollateral: [],
      indexOrIdentifier: "sETHPERP",
      supportedOrderTypes: {
        LIMIT_DECREASE: true,
        LIMIT_INCREASE: true,
        MARKET_INCREASE: true,
        MARKET_DECREASE: true,
        DEPOSIT: true,
        WITHDRAW: true,
      },
    },
    {}
  );
  logObject("Cancel Order: ", cancelOrder);
  return cancelOrder;
}

async function createTransferMarginOrder(
  ss: SynthetixV2Service,
  amount: BigNumber
): Promise<UnsignedTransaction[]> {
  const createOrder = await ss.createOrder(
    signer,
    {
      mode: "ASYNC",
      longCollateral: [],
      shortCollateral: [],
      indexOrIdentifier: "sETHPERP",
      supportedOrderTypes: {
        LIMIT_DECREASE: true,
        LIMIT_INCREASE: true,
        MARKET_INCREASE: true,
        MARKET_DECREASE: true,
        DEPOSIT: true,
        WITHDRAW: true,
      },
    },
    {
      type: "LIMIT_INCREASE",
      direction: "LONG",
      inputCollateral: {
        name: "string",
        symbol: "string",
        decimals: "string",
        address: "string",
      },
      inputCollateralAmount: amount,
      sizeDelta: ethers.utils.parseEther("0.01"),
      isTriggerOrder: false,
      referralCode: undefined,
      trigger: {
        triggerPrice: BigNumber.from("2000"),
        triggerAboveThreshold: true,
      },
    }
  );
  logObject("Create Order: ", createOrder);
  return createOrder;
}

async function main() {
  await sdk.setSigner(signer);

  const markets = await sdk.futures.getMarkets();
  const ethMarket = markets.find((market) => market.asset === "sETH");
  // console.log("Eth market: ", ethMarket);

  const sizeInEther = "0.005";

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
  const position = (await getFuturePositions(ethMarket!))[0];
  if (!position.accessibleMargin.eq(position.remainingMargin)) {
    console.log("Position is not closed yet".toUpperCase());
  }
  const withdrawAllMargin = await sdk.futures.withdrawIsolatedMargin(
    ethMarket?.market!,
    wei(position.accessibleMargin!)
  );
  logObject("Withdraw all margin: ", withdrawAllMargin);
}

async function closePosition(ethMarket: FuturesMarket) {
  try {
    await cancelDelayedOrder(ethMarket!);
  } catch (e) {
    console.log("Error cancelling delayed order: ", e);
  }

  const currentPosition = (await getFuturePositions(ethMarket!))[0];
  const sizeInEther = currentPosition.position!.size!.neg().toString();
  const itp = await isolatedTradePreview(ethMarket, sizeInEther);
  console.log(
    "itp.price: ",
    itp.price.toString(),
    "sizeInEther: ",
    sizeInEther
  );
  // TODO - need to check how to get better desired price
  await submitOrder(ethMarket!, wei(0), "-0.025");
}

async function cancelDelayedOrder(ethMarket: FuturesMarket) {
  const cancelDelayedOrder = await sdk.futures.cancelDelayedOrder(
    ethMarket.market!,
    w,
    true
  );
  logObject("Cancel delayed order: ", cancelDelayedOrder);
}

async function getDelayedOrder(ethMarket: FuturesMarket) {
  const delayedOrder = await sdk.futures.getDelayedOrder(w, ethMarket.market!);
  logObject("Delayed order: ", delayedOrder);
}

async function transferMargin(ethMarket: FuturesMarket, amount: string) {
  const transferMargin = await sdk.futures.depositIsolatedMargin(
    ethMarket?.market!,
    wei(ethers.utils.parseUnits(amount))
  );
  logObject("Transfer margin: ", transferMargin);
}

async function isolatedTradePreview(
  ethMarket: FuturesMarket,
  sizeInEther: string
): Promise<{
  fee: Wei;
  liqPrice: Wei;
  margin: Wei;
  price: Wei;
  size: Wei;
  sizeDelta: Wei;
  side: PositionSide;
  leverage: Wei;
  notionalValue: Wei;
  status: number;
  showStatus: boolean;
  statusMessage: string;
  priceImpact: Wei;
  exceedsPriceProtection: boolean;
}> {
  const isolatedTradePreview = await sdk.futures.getIsolatedTradePreview(
    ethMarket?.market!,
    ethMarket?.marketKey!,
    ContractOrderType.DELAYED_OFFCHAIN,
    {
      sizeDelta: wei(ethers.utils.parseEther(sizeInEther)),
      price: wei("0"),
      leverageSide: PositionSide.LONG,
    }
  );
  logObject("Isolated trade preview: ", isolatedTradePreview);

  return isolatedTradePreview;
}

async function submitOrder(
  ethMarket: FuturesMarket,
  fillPrice: Wei,
  sizeInEther: string
) {
  const submitOrder = await sdk.futures.submitIsolatedMarginOrder(
    ethMarket?.market!,
    wei(ethers.utils.parseEther(sizeInEther)),
    fillPrice
  );
  logObject("Submit order: ", submitOrder);
}

async function getFuturePositions(
  ethMarket: FuturesMarket
): Promise<FuturesPosition[]> {
  const futurePositions = await sdk.futures.getFuturesPositions(w, [
    {
      asset: ethMarket?.asset!,
      marketKey: ethMarket?.marketKey!,
      address: ethMarket?.market!,
    },
  ]);
  futurePositions.forEach((p) => {
    logObject("Future position: ", p);
    if (p.position) {
      logObject("Inside Position: ", p.position);
    }
  });
  return futurePositions;
}

async function crossMargin() {
  const markets = await sdk.futures.getMarkets();
  const ethMarket = markets.find((market) => market.asset === "sETH");
  console.log("Eth market key: ", ethMarket?.marketKey);

  const marginAccounts = await sdk.futures.getCrossMarginAccounts(w);
  console.log("Margin accounts: ", marginAccounts);

  const crossMarginbalance = await sdk.futures.getCrossMarginAccountBalance(
    marginAccounts[0]
  );
  console.log("Cross margin balance: ", crossMarginbalance.toString());

  const crossMarginbalanceInfo = await sdk.futures.getCrossMarginBalanceInfo(
    w,
    marginAccounts[0]
  );
  logObject("Cross margin balance info: ", crossMarginbalanceInfo);

  const crossMarginKeeperBalance =
    await sdk.futures.getCrossMarginKeeperBalance(marginAccounts[0]);
  console.log(
    "Cross margin keeper balance: ",
    crossMarginKeeperBalance.toString()
  );

  // const positionHistory = await sdk.futures.getPositionHistory(
  //   w1
  // );
  // logObject("Position history: ", positionHistory);

  const idleMargin = await sdk.futures.getIdleMargin(w, marginAccounts[0]);
  logObject("Idle margin: ", idleMargin);
  console.log("Markets with margin: ", idleMargin.marketsWithMargin);
  logObject("Position: ", idleMargin.marketsWithMargin[0].position);

  const idleMarginMarkets = await sdk.futures.getIdleMarginInMarkets(
    marginAccounts[0]
  );
  logObject("Idle margin in markets: ", idleMarginMarkets);
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function synService() {
  const ss = new SynthetixV2Service(sdk, await signer.getAddress());

  // const order = await ss.getOrder(w, "sETHPERP");
  // logObject("Order: ", order);

  // const allOrders = await ss.getAllOrders(w);
  // allOrders.forEach((o) => logObject("All Orders: ", o));

  const supportedNetworks = ss.supportedNetworks();
  // logObject("Supported Networks: ", supportedNetworks[0]);

  const supportedMarkets = await ss.supportedMarkets(supportedNetworks[0]);
  // logObject("Supported Markets: ", supportedMarkets[0]);
  // supportedMarkets.forEach((market) => logObject("Market: ", market));

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

  // await ss.getAllPositions(w, signer);

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

  const sizeDelta = "0.01";
  const direction = "SHORT";
  const marketAddress = "0x2b3bb4c683bfc5239b029131eef3b1d214478d93";

  // const positionsHistory = await sdk.futures.getCompletePositionHistory(w);
  // console.log("Position History: ", positionsHistory.length);
  // positionsHistory.forEach((p) => {
  //   logObject("Position History: ", p);
  // });

  const tradesHistory = await ss.getTradesHistory(w, undefined);
  console.log("Trades History: ", tradesHistory.length);
  tradesHistory.slice(0, 10).forEach((t) => {
    logObject("Trades History: ", t);
  });

  // const positions = await ss.getAllPositions(w, signer, undefined);
  // positions.forEach((p) => logObject("Position: ", p));

  // const closePositionTxs = await ss.closePosition(
  //   signer,
  //   positions[0],
  //   positions[0].size.mul(100).div(100)
  // );
  // closePositionTxs.forEach((tx) => {
  //   logObject("Close position tx: ", tx);
  // });
  // await fireTxs(closePositionTxs);

  // const updatePosMarginTxs = await ss.updatePositionMargin(
  //   signer,
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

  // const tradePreview = await getTradePreview(
  //   w,
  //   ss,
  //   sizeDelta,
  //   direction,
  //   fillPriceBn
  // );

  // if (tradePreview.status == 0) {
  //   const triggerPrice = direction.includes("SHORT")
  //     ? tradePreview.skewAdjustedPrice!.mul(99).div(100)
  //     : tradePreview.skewAdjustedPrice!.mul(101).div(100);
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
  const provider = new ethers.providers.AlchemyProvider(
    42161,
    ALCHEMY_KEY_OP_MAIN!.toString()
  );

  const signer = new ethers.Wallet(wpk, provider);
  const gs = new GmxV1Service(signer.address);

  let supportedMarkets = await gs.supportedMarkets(gs.supportedNetworks()[0]);

  // supportedMarkets.forEach((m) => {
  //   console.log('long:', m.longCollateral)
  //   console.log('short:', m.shortCollateral)
  //   console.log('-----')
  // });
  //

  console.log(await gs.getAllPositions(signer.address, signer))

  // await gs.setup(signer);
  // console.log("Finished Setup".toUpperCase());

  // await gs.createOrder(
  //   signer,
  //   {
  //     mode: "ASYNC",
  //     longCollateral: "",
  //     shortCollateral: "",
  //     indexOrIdentifier: getTokenBySymbol(ARBITRUM, "BTC").address,
  //     supportedOrderTypes: {
  //       LIMIT_DECREASE: true,
  //       LIMIT_INCREASE: true,
  //       MARKET_INCREASE: true,
  //       MARKET_DECREASE: true,
  //       DEPOSIT: true,
  //       WITHDRAW: true,
  //     },
  //   },
  //   {
  //     type: "MARKET_DECREASE",
  //     direction: "LONG",
  //     inputCollateral: {
  //       name: "string",
  //       symbol: "string",
  //       decimals: "string",
  //       address: getTokenBySymbol(ARBITRUM, "USDC.e").address,
  //     },
  //     inputCollateralAmount: ethers.utils.parseUnits("4", 30),
  //     sizeDelta: ethers.utils.parseUnits("0", 30),
  //     isTriggerOrder: false,
  //     referralCode: undefined,
  //     trigger: {
  //       triggerPrice: ethers.utils.parseUnits("1850", 30),
  //       triggerAboveThreshold: false,
  //     },
  //   }
  // );

  // const positions = await gs.getAllPositions(w, signer);
  // positions.forEach((p) => {
  //   logObject("Position: ", p);
  // });
}

async function compositeService() {
  const ss = new SynthetixV2Service(sdk, await signer.getAddress());
  const gs = new GmxV1Service(await signer.getAddress());

  const cs = new CompositeService(ss, gs);

  let openMarkets = (await cs.getOpenMarkets())["ETH/USD"]
  console.dir(openMarkets, { depth: 10 });
}

gmxService()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
