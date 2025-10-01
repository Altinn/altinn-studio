import { numericFormatter, patternFormatter } from 'react-number-format';
import type { NumericFormatProps, PatternFormatProps } from 'react-number-format';

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

  //This is a temporary fix until Intl.NumberFormat is fixed in Chrome using nynorsk
  //https://stackoverflow.com/questions/72173540/datetime-internationalization-not-working-for-norwegian-nynorsk-locale
  const browserSupportsLocale =
    locale && locale.includes('nn') ? Intl.NumberFormat.supportedLocalesOf(['nn', 'nn-NO']).length > 0 : true;
  const finalLocale = browserSupportsLocale && locale ? locale : 'nb';

  const intlFormatting = new Intl.NumberFormat(finalLocale, options).formatToParts(parseFloat(number));
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

export const isPatternFormat = (
  numberFormat: NumericFormatProps | PatternFormatProps,
): numberFormat is PatternFormatProps => (numberFormat as PatternFormatProps).format !== undefined;

export const isNumericFormat = (
  numberFormat: NumericFormatProps | PatternFormatProps,
): numberFormat is NumericFormatProps => (numberFormat as PatternFormatProps).format === undefined;

export const formatNumericText = (text: string, format?: NumericFormatProps | PatternFormatProps) => {
  if (format && isNumericFormat(format)) {
    return numericFormatter(text, format);
  } else if (format && isPatternFormat(format)) {
    return patternFormatter(text, format);
  } else {
    return text;
  }
};
