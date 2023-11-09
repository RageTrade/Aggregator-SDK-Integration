import { FixedFormat, FixedNumber } from 'ethers-v6'

export function addFN(f1: FixedNumber, f2: FixedNumber, format?: FixedFormat): FixedNumber {
  let out;
  if (f1.decimals === f2.decimals) {
    out = f1.add(f2);
  } else if (f1.decimals > f2.decimals) {
    out = f1.add(f2.toFormat(f1.decimals));
  } else {
    out = f1.toFormat(f2.decimals).add(f2);
  }
  return format ? out.toFormat(format) : out;
}

export function subFN(f1: FixedNumber, f2: FixedNumber, format?: FixedFormat): FixedNumber {
  let out;
  if (f1.decimals === f2.decimals) {
    out = f1.sub(f2);
  } else if (f1.decimals > f2.decimals) {
    out = f1.sub(f2.toFormat(f1.decimals));
  } else {
    out = f1.toFormat(f2.decimals).sub(f2);
  }
  return format ? out.toFormat(format) : out;
}

export function mulFN(f1: FixedNumber, f2: FixedNumber, format?: FixedFormat): FixedNumber {
  let out;
  if (f1.decimals === f2.decimals) {
    out = f1.mul(f2);
  } else if (f1.decimals > f2.decimals) {
    out = f1.mul(f2.toFormat(f1.decimals));
  } else {
    out = f1.toFormat(f2.decimals).mul(f2);
  }
  return format ? out.toFormat(format) : out;
}

export function divFN(f1: FixedNumber, f2: FixedNumber, format?: FixedFormat): FixedNumber {
  let out;
  if (f1.decimals === f2.decimals) {
    out = f1.div(f2);
  } else if (f1.decimals > f2.decimals) {
    out = f1.div(f2.toFormat(f1.decimals));
  } else {
    out = f1.toFormat(f2.decimals).div(f2);
  }
  return format ? out.toFormat(format) : out;
}


