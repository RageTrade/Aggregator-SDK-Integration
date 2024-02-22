import { config } from 'dotenv'
import { ApiOpts } from '../src/interfaces/V1/IRouterAdapterBaseV1'
import RouterV1 from '../router/RouterV1'

config()

const AEVO_KEY = process.env.AEVO_KEY
const SECRET = process.env.SECRET

const aevoPrivateOpts: ApiOpts = {
  bypassCache: false,
  aevoAuth: {
    apiKey: AEVO_KEY!,
    secret: SECRET!
  }
}

const normalAddress = '0x2f88a09ed4174750a464576FE49E586F90A34820'
const w = normalAddress

const router = new RouterV1()

async function getAccountInfo() {
  console.log('Account info without credentials')
  const accountInfoWoutCredentials = await router.getAccountInfo(w, undefined)
  console.dir(accountInfoWoutCredentials, { depth: 4 })

  console.log('\nAccount info with credentials')
  const accountInfo = await router.getAccountInfo(w, aevoPrivateOpts)
  console.dir(accountInfo, { depth: 4 })
}

getAccountInfo()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
