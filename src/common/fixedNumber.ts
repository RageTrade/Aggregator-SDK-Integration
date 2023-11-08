import { FixedFormat, FixedNumber } from 'ethers-v6'

declare module 'ethers-v6' {
  export class FixedNumber {
    addFormat(other: FixedNumber, format?: FixedFormat): FixedNumber
    subFormat(other: FixedNumber, format?: FixedFormat): FixedNumber
    mulFormat(other: FixedNumber, format?: FixedFormat): FixedNumber
    divFormat(other: FixedNumber, format?: FixedFormat): FixedNumber
  }
}

FixedNumber.prototype.addFormat = function (other: FixedNumber, format?: FixedFormat): FixedNumber {
  let out
  if (this.decimals === other.decimals) {
    out = this.add(other)
  } else if (this.decimals > other.decimals) {
    out = this.add(other.toFormat(this.decimals))
  } else {
    out = this.toFormat(other.decimals).add(other)
  }
  return format ? out.toFormat(format) : out
}
FixedNumber.prototype.subFormat = function (other: FixedNumber, format?: FixedFormat): FixedNumber {
  let out
  if (this.decimals === other.decimals) {
    out = this.sub(other)
  } else if (this.decimals > other.decimals) {
    out = this.sub(other.toFormat(this.decimals))
  } else {
    out = this.toFormat(other.decimals).sub(other)
  }
  return format ? out.toFormat(format) : out
}
FixedNumber.prototype.mulFormat = function (other: FixedNumber, format?: FixedFormat): FixedNumber {
  let out
  if (this.decimals === other.decimals) {
    out = this.mul(other)
  } else if (this.decimals > other.decimals) {
    out = this.mul(other.toFormat(this.decimals))
  } else {
    out = this.toFormat(other.decimals).mul(other)
  }
  return format ? out.toFormat(format) : out
}
FixedNumber.prototype.divFormat = function (other: FixedNumber, format?: FixedFormat): FixedNumber {
  let out
  if (this.decimals === other.decimals) {
    out = this.div(other)
  } else if (this.decimals > other.decimals) {
    out = this.div(other.toFormat(this.decimals))
  } else {
    out = this.toFormat(other.decimals).div(other)
  }
  return format ? out.toFormat(format) : out
}
