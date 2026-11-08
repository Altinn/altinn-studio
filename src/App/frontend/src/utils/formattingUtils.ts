import { numericFormatter, patternFormatter } from 'react-number-format';
import type { NumericFormatProps, PatternFormatProps } from 'react-number-format';

import type { IFormatting } from '@app/layout-contract/generated/common.generated';

import type { ExprResolved } from 'src/features/expressions/types';

type Formatting = ExprResolved<IFormatting>;

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

export const getMapToReactNumberConfig = (
  formatting: Formatting | undefined,
  value = '',
  selectedLanguage: string,
): { number?: NumericFormatProps | PatternFormatProps } => {
  if (!formatting?.currency && !formatting?.unit) {
    return formatting ?? {};
  }

  const createOptions = (config: Formatting): CurrencyFormattingOptions | UnitFormattingOptions | undefined => {
    if (config.currency) {
      return { style: 'currency', currency: config.currency };
    }
    if (config.unit) {
      return { style: 'unit', unit: config.unit };
    }
    return undefined;
  };
  // Check if position has been configured in dynamic formatting. Either prefix or suffix
  const position = formatting?.position || undefined;

  const numberFormatResult = {
    ...formatNumber(value, selectedLanguage, createOptions(formatting), position),
    ...formatting.number,
  };
  return { ...formatting, number: numberFormatResult };
};
