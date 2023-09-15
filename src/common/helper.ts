import { BigNumber, ethers } from "ethers";
import { NumberDecimal } from "../interface";

export function getEnumKeyByEnumValue<T extends { [index: string]: string }>(
  myEnum: T,
  enumValue: string
): keyof T | null {
  let keys = Object.keys(myEnum).filter((x) => myEnum[x] == enumValue);
  return keys.length > 0 ? keys[0] : null;
}

function keys(obj: object) {
  return Object.keys(obj) as Array<keyof Object>;
}

export function logObject(title: string, obj: object) {
  console.log(
    title,
    keys(obj).map((key) => key + ": " + (obj[key] ? obj[key].toString() : ""))
  );
}

export function getEnumEntryByValue<T extends { [index: string]: string }>(
  myEnum: T,
  enumValue: string
): T[keyof T] | null {
  let keys = Object.keys(myEnum).filter((x) => myEnum[x] == enumValue);
  return keys.length > 0 ? myEnum[keys[0] as keyof T] : null;
}

export function toNumberDecimal(
  input: BigNumber,
  decimals: number
): NumberDecimal {
  return {
    value: input.toString(),
    decimals: decimals,
  };
}

export function formatN(value: BigNumber, decimals: number = 18): string {
  return ethers.utils.formatUnits(value, decimals);
}

export function applySlippage(
  value: BigNumber,
  slippage: string,
  increment: boolean
): BigNumber {
  const BPS = 10000;
  const slippageBPS = (BPS / 100) * Number(slippage);
  return increment
    ? value.add(value.mul(slippageBPS).div(BPS))
    : value.sub(value.mul(slippageBPS).div(BPS));
}
