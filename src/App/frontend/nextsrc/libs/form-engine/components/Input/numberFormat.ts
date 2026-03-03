import { useMemo } from 'react';

import type { NumericFormatProps, PatternFormatProps } from 'react-number-format';

interface FormattingResult {
  thousandSeparator?: string;
  decimalSeparator?: string;
  prefix?: string;
  suffix?: string;
}

interface Formatting {
  number?: NumericFormatProps | PatternFormatProps;
  currency?: string;
  unit?: string;
  position?: 'prefix' | 'suffix';
  align?: 'left' | 'center' | 'right';
}

export function isPatternFormat(
  format: NumericFormatProps | PatternFormatProps,
): format is PatternFormatProps {
  return (format as PatternFormatProps).format !== undefined;
}

export function isNumericFormat(
  format: NumericFormatProps | PatternFormatProps,
): format is NumericFormatProps {
  return (format as PatternFormatProps).format === undefined;
}

function formatNumber(
  value: string,
  locale: string,
  options: { style: 'currency'; currency: string } | { style: 'unit'; unit: string },
  position: 'prefix' | 'suffix' | undefined,
): FormattingResult {
  const result: FormattingResult = {};

  // Workaround for nynorsk locale support
  const browserSupportsLocale =
    locale.includes('nn') ? Intl.NumberFormat.supportedLocalesOf(['nn', 'nn-NO']).length > 0 : true;
  const finalLocale = browserSupportsLocale ? locale : 'nb';

  const parts = new Intl.NumberFormat(finalLocale, options).formatToParts(parseFloat(value) || 0);

  for (const part of parts) {
    if (part.type === 'group') {
      result.thousandSeparator = part.value;
    }
    if (part.type === 'decimal') {
      result.decimalSeparator = part.value;
    }
    if (part.type === 'currency') {
      if (position === 'suffix') {
        result.suffix = ` ${part.value}`;
      } else {
        result.prefix = `${part.value} `;
      }
    }
    if (part.type === 'unit') {
      if (position === 'prefix') {
        result.prefix = `${part.value} `;
      } else {
        result.suffix = ` ${part.value}`;
      }
    }
  }

  return result;
}

interface NumberFormatConfig {
  number?: NumericFormatProps | PatternFormatProps;
}

function getNumberFormatConfig(
  formatting: Formatting | undefined,
  value: string,
  language: string,
): NumberFormatConfig {
  if (!formatting) {
    return {};
  }

  if (!formatting.currency && !formatting.unit) {
    return formatting;
  }

  const options = formatting.currency
    ? ({ style: 'currency', currency: formatting.currency } as const)
    : ({ style: 'unit', unit: formatting.unit! } as const);

  const numberFormatResult = {
    ...formatNumber(value, language, options, formatting.position),
    ...formatting.number,
  };

  return { ...formatting, number: numberFormatResult };
}

export function useNumberFormatConfig(
  formatting: Formatting | undefined,
  value: string,
  language: string,
): NumberFormatConfig {
  return useMemo(
    () => getNumberFormatConfig(formatting, value, language),
    [formatting, value, language],
  );
}
