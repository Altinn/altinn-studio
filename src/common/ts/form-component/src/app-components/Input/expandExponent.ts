const exponentNotation = /^([+-]?)(\d+)(?:\.(\d*))?e([+-]?\d+)$/i;

// JavaScript writes numbers with exponents from -324 to 308. Larger exponents only come from strings, and expanding
// them could build a string too long to render.
const maxExponent = 324;

/**
 * Writes a number in exponent notation, such as '1.5e-7', as plain decimals ('0.00000015'). JavaScript writes
 * very small and very large numbers this way, but react-number-format reads the 'e' and the exponent as digits.
 * The string is rewritten rather than parsed, so no digits are lost to rounding. Other strings, and exponents no
 * JavaScript number has, are returned as is.
 */
export function expandExponent(value: string): string {
  const match = exponentNotation.exec(value.trim());
  if (!match || Math.abs(Number(match[4])) > maxExponent) {
    return value;
  }

  const [, sign, integerDigits, fractionDigits = '', exponent] = match;
  const digits = (integerDigits + fractionDigits).replace(/^0+/, '');
  if (!digits) {
    return '0';
  }

  const leadingZeros = integerDigits.length + fractionDigits.length - digits.length;
  const decimalIndex = integerDigits.length - leadingZeros + Number(exponent);
  const negative = sign === '-' ? '-' : '';
  if (decimalIndex <= 0) {
    return `${negative}0.${'0'.repeat(-decimalIndex)}${digits}`;
  }
  if (decimalIndex >= digits.length) {
    return `${negative}${digits}${'0'.repeat(decimalIndex - digits.length)}`;
  }
  return `${negative}${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
}
