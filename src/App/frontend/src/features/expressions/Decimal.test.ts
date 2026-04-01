import { Decimal } from 'src/features/expressions/Decimal';

describe('Decimal', () => {
  describe('add', () => {
    test.each`
      term1  | term2   | sum
      ${1}   | ${2}    | ${3}
      ${1}   | ${-2}   | ${-1}
      ${1}   | ${0.1}  | ${1.1}
      ${1}   | ${-0.1} | ${0.9}
      ${0.1} | ${0.2}  | ${0.3}
    `('$term1 + $term2 = $sum', ({ term1, term2, sum }) => {
      expect(Decimal.add(term1, term2)).toBe(sum);
    });
  });

  describe('subtract', () => {
    test.each`
      minuend | subtrahend | difference
      ${3}    | ${2}       | ${1}
      ${3}    | ${4}       | ${-1}
      ${3}    | ${-2}      | ${5}
      ${3}    | ${0.1}     | ${2.9}
      ${-3}   | ${2}       | ${-5}
      ${0.3}  | ${0.2}     | ${0.1}
    `('$minuend - $subtrahend = $difference', ({ minuend, subtrahend, difference }) => {
      expect(Decimal.subtract(minuend, subtrahend)).toBe(difference);
    });
  });

  describe('multiply', () => {
    test.each`
      factor1 | factor2 | product
      ${3}    | ${2}    | ${6}
      ${3}    | ${-2}   | ${-6}
      ${4}    | ${0.5}  | ${2}
      ${4}    | ${-0.5} | ${-2}
      ${3}    | ${0.1}  | ${0.3}
    `('$factor1 * $factor2 = $product', ({ factor1, factor2, product }) => {
      expect(Decimal.multiply(factor1, factor2)).toBe(product);
    });
  });

  describe('divide', () => {
    test.each`
      dividend | divisor | quotient
      ${6}     | ${3}    | ${2}
      ${6}     | ${-3}   | ${-2}
      ${2}     | ${0.5}  | ${4}
      ${2}     | ${-0.5} | ${-4}
      ${-6}    | ${3}    | ${-2}
      ${0.3}   | ${0.1}  | ${3}
    `('$dividend / $divisor = $quotient', ({ dividend, divisor, quotient }) => {
      expect(Decimal.divide(dividend, divisor)).toBe(quotient);
    });
  });
});
