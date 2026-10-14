import { parsePastedNumber } from 'src/layout/Input/number-format-helpers';

describe('parsePastedNumber', () => {
  it.each([
    { text: '2.5', thousandSeparator: '.', decimalSeparator: ',', expected: '2.5' },
    { text: '2,5', thousandSeparator: true, decimalSeparator: '.', expected: '2.5' },
    { text: '2.345', thousandSeparator: '.', decimalSeparator: ',', expected: '2.34' },
    { text: '2,345', thousandSeparator: true, decimalSeparator: '.', expected: '2.34' },
    { text: '1,234.567', thousandSeparator: ',', decimalSeparator: '.', expected: '1234.56' },
    { text: '1.234,567', thousandSeparator: '.', decimalSeparator: ',', expected: '1234.56' },
    { text: '1 234,567', thousandSeparator: ' ', decimalSeparator: ',', expected: '1234.56' },
    { text: '1,234.567', thousandSeparator: true, decimalSeparator: '.', expected: '1234.56' },
    { text: '1.234.567', thousandSeparator: '.', decimalSeparator: ',', expected: '1234567' },
    { text: '1,234,567', thousandSeparator: true, decimalSeparator: '.', expected: '1234567' },
    { text: '1 234', thousandSeparator: ' ', decimalSeparator: ',', expected: '1234' },
  ])('parses $text with grouping $thousandSeparator and decimal $decimalSeparator', (testCase) => {
    const { text, expected, thousandSeparator, decimalSeparator } = testCase;
    expect(parsePastedNumber(text, { thousandSeparator, decimalSeparator, decimalScale: 2 })).toBe(expected);
  });

  it.each(['2.345', '2,345'])('truncates %s to integer precision', (text) => {
    expect(parsePastedNumber(text, { thousandSeparator: ' ', decimalSeparator: ',', decimalScale: 0 })).toBe('2');
  });

  it('uses the default decimal separator with boolean comma grouping', () => {
    expect(parsePastedNumber('2,5', { thousandSeparator: true })).toBe('2.5');
  });
});
