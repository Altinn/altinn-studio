import type { NumberFormatProps, PatternFormatProps } from '@app/layout-contract/generated/common.generated';

export const isPatternFormat = (
  format: NumberFormatProps | PatternFormatProps | undefined,
): format is PatternFormatProps => (format ? (format as PatternFormatProps).format !== undefined : false);

export const isNumberFormat = (
  format: NumberFormatProps | PatternFormatProps | undefined,
): format is NumberFormatProps => (format ? (format as PatternFormatProps).format === undefined : false);
