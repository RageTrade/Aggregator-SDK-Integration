import KwentaSDK from "@kwenta/sdk";
import { BigNumber, ethers, Signer, BigNumberish } from "ethers";
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

config();

const { ALCHEMY_KEY_OP_MAIN, PRIVATE_KEY } = process.env;

const w1 = "0xd344b73Ac42e34bC8009d522657adE4346B72c9D";
const w1pk = PRIVATE_KEY!.toString();

function keys<T extends object>(obj: T) {
  return Object.keys(obj) as Array<keyof T>;
}

function logObject(title: string, obj: object) {
  console.log(
    title,
    keys(obj).map((key) => key + ": " + obj[key])
  );
}

let provider = new ethers.providers.AlchemyProvider(
  "optimism",
  ALCHEMY_KEY_OP_MAIN!.toString()
);

const signer = new ethers.Wallet(w1pk, provider);

const sdk = new KwentaSDK({
  networkId: 10,
  provider: provider,
});

async function synService() {
  console.log("Private Key: ", PRIVATE_KEY);

  const ss = new SynthetixV2Service(sdk);
  const supportedNetworks = ss.supportedNetworks();
  logObject("Supported Networks: ", supportedNetworks[0]);

  const supportedMarkets = await ss.supportedMarkets(supportedNetworks[0]);
  logObject("Supportted Markets: ", supportedMarkets[0]);

  await createLongOrder(ss);
  await createTransferMarginOrder(ss);
  await cancelDelayedOffChainOrder(ss);
}

async function cancelDelayedOffChainOrder(ss: SynthetixV2Service) {
  const cancelOrder = await ss.cancelOrder(
    signer,
    {
      mode: "ASYNC",
      longCollateral: "",
      shortCollateral: "string",
      indexOrIdentifier: "sETHPERP",
      supportedOrderTypes: {
        LIMIT_DECREASE: true,
        LIMIT_INCREASE: true,
        MARKET_INCREASE: true,
        MARKET_DECREASE: true,
      },
    },
    "0"
  );
  logObject("Cancel Order: ", cancelOrder);
}

async function createLongOrder(ss: SynthetixV2Service) {
  const createOrder = await ss.createOrder(
    signer,
    {
      mode: "ASYNC",
      longCollateral: "",
      shortCollateral: "",
      indexOrIdentifier: "sETHPERP",
      supportedOrderTypes: {
        LIMIT_DECREASE: true,
        LIMIT_INCREASE: true,
        MARKET_INCREASE: true,
        MARKET_DECREASE: true,
      },
    },
    {
      type: "MARKET_INCREASE",
      direction: "LONG",
      inputCollateral: {
        name: "string",
        symbol: "string",
        decimals: "string",
        address: "string",
      },
      inputCollateralAmount: ethers.utils.parseUnits("10"),
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
}

async function createTransferMarginOrder(ss: SynthetixV2Service) {
  const createOrder = await ss.createOrder(
    signer,
    {
      mode: "ASYNC",
      longCollateral: "",
      shortCollateral: "",
      indexOrIdentifier: "sETHPERP",
      supportedOrderTypes: {
        LIMIT_DECREASE: true,
        LIMIT_INCREASE: true,
        MARKET_INCREASE: true,
        MARKET_DECREASE: true,
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
      inputCollateralAmount: ethers.utils.parseUnits("10"),
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
    w1,
    true
  );
  logObject("Cancel delayed order: ", cancelDelayedOrder);
}

async function getDelayedOrder(ethMarket: FuturesMarket) {
  const delayedOrder = await sdk.futures.getDelayedOrder(w1, ethMarket.market!);
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
  const futurePositions = await sdk.futures.getFuturesPositions(w1, [
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

  const marginAccounts = await sdk.futures.getCrossMarginAccounts(w1);
  console.log("Margin accounts: ", marginAccounts);

  const crossMarginbalance = await sdk.futures.getCrossMarginAccountBalance(
    marginAccounts[0]
  );
  console.log("Cross margin balance: ", crossMarginbalance.toString());

  const crossMarginbalanceInfo = await sdk.futures.getCrossMarginBalanceInfo(
    w1,
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

  const idleMargin = await sdk.futures.getIdleMargin(w1, marginAccounts[0]);
  logObject("Idle margin: ", idleMargin);
  console.log("Markets with margin: ", idleMargin.marketsWithMargin);
  logObject("Position: ", idleMargin.marketsWithMargin[0].position);

  const idleMarginMarkets = await sdk.futures.getIdleMarginInMarkets(
    marginAccounts[0]
  );
  logObject("Idle margin in markets: ", idleMarginMarkets);
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

synService()
  .then()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
