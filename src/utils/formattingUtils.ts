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
  position: string | undefined,
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
