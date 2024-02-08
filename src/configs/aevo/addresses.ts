import { Chain } from 'viem'
import { Token } from '../../common/tokens'

export const aevoAddresses = {
  10: {
    socketHelper: '0xe49dee5353bea74caf65089237005198a14f7c83',
    vault: {
      'USDC.e': '0xFff4A34925301d231ddF42B871c3b199c1E80584',
      USDC: '0x7809621a6D7e61E400853C64b61568aA773A28Ef',
      WETH: '0x5c7Dd6cb73d93879E94F20d103804C495A10aE7e'
    },
    connector: {
      'USDC.e': '0x1812ff6bd726934f18159164e2927B34949B16a8',
      USDC: '0xF0A0B2E99D081Ee737496DAD5E2267ab12139793',
      WETH: '0xeCaa2435d99c4987876A0382F1661dBf539700C0'
    },
    withdrawalConnector: {
      'USDC.e': '0x7b9ed5C43E87DAFB03211651d4FA41fEa1Eb9b3D',
      USDC: '0x0c0Ed11E55EFF4bb8324e2497e6CA34FD2D87f67',
      WETH: '0x48B4f0692eaA84F1961b64342Ae746D40d9ac2F2'
    },
    l2WithdrawProxy: '0xE3EF8bEE5c378D4D3DB6FEC96518e49AE2D2b957'
  },
  42161: {
    socketHelper: '0xfb73dfff0ae6aa94559b1b17421cf42e198b8d22',
    vault: {
      'USDC.e': '0x80d40e32FAD8bE8da5C6A42B8aF1E181984D137c',
      USDC: '0x7711C90bD0a148F3dd3f0e587742dc152c3E9DDB',
      WETH: '0x90bFB3C35ddfBbA42D998414F0ff1eADD430E161'
    },
    connector: {
      'USDC.e': '0x69Adf49285c25d9f840c577A0e3cb134caF944D3',
      USDC: '0x070FeadF2208303d341D1d2DA6aa41395f8BCE43',
      WETH: '0x63D8934c1fC89F57b17AB5e14db52bB07D577C0F'
    },
    withdrawalConnector: {
      'USDC.e': '0x73019b64e31e699fFd27d54E91D686313C14191C',
      USDC: '0x47DF1018Ad9CEA463C014f7Bdb39A531C2024510',
      WETH: '0xF19516273AfF391293ff79822c08e66932b77AA6'
    },
    l2WithdrawProxy: '0xE3EF8bEE5c378D4D3DB6FEC96518e49AE2D2b957'
  }
} as Record<
  Chain['id'],
  {
    socketHelper: `0x${string}`
    vault: Record<Token['symbol'], `0x${string}`>
    connector: Record<Token['symbol'], `0x${string}`>
    withdrawalConnector: Record<Token['symbol'], `0x${string}`>
    l2WithdrawProxy: `0x${string}`
  }
>
