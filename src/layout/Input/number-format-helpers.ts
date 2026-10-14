import { numericFormatter, removeNumericFormat } from 'react-number-format';
import type { NumericFormatProps } from 'react-number-format';

import type { NumberFormatProps, PatternFormatProps } from 'src/layout/common.generated';

export const isPatternFormat = (
  format: NumberFormatProps | PatternFormatProps | undefined,
): format is PatternFormatProps => (format ? (format as PatternFormatProps).format !== undefined : false);

export const isNumberFormat = (
  format: NumberFormatProps | PatternFormatProps | undefined,
): format is NumberFormatProps => (format ? (format as PatternFormatProps).format === undefined : false);

export function parsePastedNumber(pastedText: string, format: NumericFormatProps): string {
  const thousandSeparator = format.thousandSeparator === true ? ',' : format.thousandSeparator;
  const decimalSeparator = format.decimalSeparator ?? '.';
  const groups = thousandSeparator ? pastedText.split(thousandSeparator) : [pastedText];
  // A lone comma or dot may be an alternate decimal separator. Preserve the paste workaround in that case.
  const hasGrouping =
    thousandSeparator &&
    (pastedText.includes(decimalSeparator) || groups.length > 2 || !['.', ','].includes(thousandSeparator));
  const ungroupedText = hasGrouping ? groups.join('') : pastedText;
  // Apply the input's precision before saving, so decimals hidden by decimalScale are not stored.
  const formatted = numericFormatter(ungroupedText.replace(',', '.'), format);
  const changeMeta = {
    from: { start: 0, end: 0 },
    to: { start: 0, end: formatted.length },
    lastValue: '',
  };
  return removeNumericFormat(formatted, changeMeta, format);
}
