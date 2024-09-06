import type { NumberFormatProps, PatternFormatProps } from 'src/layout/common.generated';

export const isPatternFormat = (
  format: NumberFormatProps | PatternFormatProps | undefined,
): format is PatternFormatProps => (format ? (format as PatternFormatProps).format !== undefined : false);

export const isNumberFormat = (
  format: NumberFormatProps | PatternFormatProps | undefined,
): format is NumberFormatProps => (format ? (format as PatternFormatProps).format === undefined : false);
