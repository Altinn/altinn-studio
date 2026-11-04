import { expandExponent } from './expandExponent';

describe('expandExponent', () => {
  it.each([
    ['1.270667891713e-16', '0.0000000000000001270667891713'],
    ['1.5e-7', '0.00000015'],
    ['-1e-7', '-0.0000001'],
    ['1e21', '1000000000000000000000'],
    ['1.2345e+22', '12345000000000000000000'],
    ['1.25e1', '12.5'],
    ['0.05e2', '5'],
    ['0e5', '0'],
    ['5e-324', `0.${'0'.repeat(323)}5`],
  ])('writes %s as %s', (value, expected) => {
    expect(expandExponent(value)).toBe(expected);
    expect(Number(expandExponent(value))).toBe(Number(value));
  });

  it.each(['', '123.45', '-0.5', '1 234,5', 'e5', 'abc', '1e9999999999', '1e-9999999999'])(
    'returns %j unchanged',
    (value) => {
      expect(expandExponent(value)).toBe(value);
    },
  );
});
