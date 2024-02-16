import {
  getAevoWssOrderBook,
  getAevoWssTicker,
  openAevoWssConnection,
  aevoSubscribeOrderBook
} from '../../src/configs/aevo/aevoWsClient'
import { aevoCacheGetAllMarkets } from '../../src/configs/aevo/aevoCacheHelper'
import { AevoClient } from '../../generated/aevo'
import { ExtendedAevoClient } from '../../src/exchanges/aevo'
import { config } from 'dotenv'
import { ApiOpts } from '../../src/interfaces/V1/IRouterAdapterBaseV1'
import { FixedNumber } from '../../src/common/fixedNumber'
import { ZERO_FN } from '../../src/common/constants'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const aevoClient = new ExtendedAevoClient()
const publicApi = aevoClient.publicApi
const privateApi = aevoClient.privateApi

config()

const AEVO_KEY = process.env.AEVO_KEY
const SECRET = process.env.SECRET
aevoClient.setCredentials(AEVO_KEY!, SECRET!)

const aevoPrivateOpts: ApiOpts = {
  bypassCache: true,
  aevoAuth: {
    apiKey: AEVO_KEY!,
    secret: SECRET!
  }
}

const btcMarketId = '42161-AEVO-BTC'
const ethMarketId = '42161-AEVO-ETH'

async function tickerResponse() {
  await openAevoWssConnection()

  await delay(2000)

  const ticker = getAevoWssTicker('BTC')
  console.log(ticker)
}

async function obResponse() {
  openAevoWssConnection()
  await delay(1000)

  aevoSubscribeOrderBook(btcMarketId, undefined)
  await delay(1000)

  const OB = getAevoWssOrderBook('BTC')
  console.log(OB)
}

// return num.Max(mark.Sub(num.NewFloat(equity- maintenance_margin).Div(num.NewFloat(position.Amount()))), num.O)
// to get the liq price after the order, just adjust the position amount
// accountValue - floatSide * absPos * (mrkPrice - liqPrice) * correction >= ntlPos / maintLev
// account - absPos(mrkPrice - liqPrice) = mm
// account + absPos(lp - mp) = mm
// absPos(lp - mp) = mm - account
// lp - mp = (mm - account) / absPos
// lp = mp + (mm - account) / absPos
async function estimateLiqPrice() {
  const accountData = await privateApi.getAccount()
  const positions = accountData.positions!
  const markets = await publicApi.getMarkets()
  const accFunding = await privateApi.getAccountAccumulatedFundings()
  let cumMargin = ZERO_FN
  for (const col of accountData.collaterals!) {
    cumMargin = cumMargin.addFN(FixedNumber.fromString(col.margin_value))
  }
  console.log('Cumulative Margin: ', cumMargin.toString())

  for (const pos of positions) {
    console.log('Pos: ', pos.asset)
    const floatSide = FixedNumber.fromString(pos.side == 'buy' ? '1' : '-1')
    const maxLev = FixedNumber.fromString(markets.find((m) => m.underlying_asset == pos.asset)!.max_leverage!)
    const mp = FixedNumber.fromString(pos.mark_price)
    const avgEntryPrice = FixedNumber.fromString(pos.avg_entry_price)
    const posSize = FixedNumber.fromString(pos.amount)
    const posSizeNtl = avgEntryPrice.mulFN(posSize)
    const mm = posSizeNtl.mulFN(FixedNumber.fromString('0.03')) // 3% maintenance margin
    // const equity = FixedNumber.fromString(accountData.equity)
    const accMM = FixedNumber.fromString(accountData.maintenance_margin)
    const pnl = FixedNumber.fromString(pos.unrealized_pnl)
    console.log('pnl: ', pnl)
    const funding =
      accFunding && accFunding.accumulated_fundings
        ? FixedNumber.fromString(
            accFunding.accumulated_fundings.find((f) => f.instrument_id == pos.instrument_id)?.accumulated_funding ||
              '0'
          )
        : ZERO_FN
    console.log('Funding: ', funding)

    const liqPriceAV = mp.subFN(cumMargin.addFN(pnl).subFN(accMM).divFN(posSize).mulFN(floatSide))
    console.log('Liq Price from AV: ', liqPriceAV)

    // const accountValue = FixedNumber.fromString(accountData.equity)
    // const correction = FixedNumber.fromString('1').addFN(floatSide.divFN(maxLev.mulFN(FixedNumber.fromString('0.9'))))
    // const cfp = correction.mulFN(floatSide).mulFN(posSize)
    // const liqPriceUs = cfp.mulFN(mp).addFN(mm).subFN(accountValue.subFN(mm)).divFN(cfp)
    // console.log('Liq Price from US: ', liqPriceUs)
  }
}

estimateLiqPrice()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
