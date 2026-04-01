import { Decimal as Decimaljs } from 'decimal.js';

interface DecimalFacade {
  add(term1: number, term2: number): number;
  subtract(minuend: number, subtrahend: number): number;
  multiply(factor1: number, factor2: number): number;
  divide(dividend: number, divisor: number): number;
}

export const Decimal: DecimalFacade = class {
  static add(term1: number, term2: number): number {
    return Decimaljs.add(term1, term2).toNumber();
  }

  static subtract(minuend: number, subtrahend: number): number {
    return Decimaljs.sub(minuend, subtrahend).toNumber();
  }

  static multiply(factor1: number, factor2: number): number {
    return Decimaljs.mul(factor1, factor2).toNumber();
  }

  static divide(factor1: number, factor2: number): number {
    return Decimaljs.div(factor1, factor2).toNumber();
  }
};
