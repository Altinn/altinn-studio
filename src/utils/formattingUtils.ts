type FormattingResult = {
  thousandSeparator: string | undefined;
  decimalSeparator: string | undefined;
  suffix: string | undefined;
  prefix: string | undefined;
};

export type CurrencyFormattingOptions = {
  style: 'currency';
  currency: string;
};

export type UnitFormattingOptions = {
  style: 'unit';
  unit: string;
};

export const formatNumber = (
  number: string,
  locale: string | null,
  options: CurrencyFormattingOptions | UnitFormattingOptions | undefined,
  position: 'prefix' | 'suffix' | undefined,
): FormattingResult => {
  const defaultFormat: FormattingResult = {
    thousandSeparator: undefined,
    decimalSeparator: undefined,
    prefix: undefined,
    suffix: undefined,
  };

  if (!options) {
    return defaultFormat;
  }

  const intlFormatting = new Intl.NumberFormat(locale ?? 'nb', options).formatToParts(parseFloat(number));
  const intlResult = defaultFormat;

  intlFormatting.forEach((part) => {
    if (part.type === 'group') {
      intlResult.thousandSeparator = part.value;
    }
    if (part.type === 'decimal') {
      intlResult.decimalSeparator = part.value;
    }
    if (part.type === 'currency') {
      position === 'suffix' ? (intlResult.suffix = ` ${part.value}`) : (intlResult.prefix = `${part.value} `);
    }
    if (part.type === 'unit') {
      position === 'prefix' ? (intlResult.prefix = `${part.value} `) : (intlResult.suffix = ` ${part.value}`);
    }
  });
  return intlResult;
};

/**
 * Checks if a string can be parsed to a decimal in C#.
 * 1. Empty string is valid. This will get removed from the datamodel before save.
 * 2. Value must be parsable as float in javascript.
 * 3. Value must be between +- 7.9e28
 * @see https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/floating-point-numeric-types
 */
export function canBeParsedToDecimal(value: string): boolean {
  if (!value.length) {
    return true;
  }
  const parsedValue = parseFloat(value);
  return isFinite(parsedValue) && parsedValue < 7.92e28 && parsedValue > -7.92e28;
}
