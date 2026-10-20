import { CommonExpressions } from '@app/layout-contract/generated/expressions.generated';
import type { IFormatting } from '@app/layout-contract/generated/common.generated';

import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { ExprResolved } from 'src/features/expressions/types';

/** Resolves the formatting properties consumed by Input and Number at their current data model location. */
export function useResolvedFormatting(formatting: IFormatting | undefined): ExprResolved<IFormatting> | undefined {
  const number = formatting?.number;
  const pattern = number && 'format' in number ? number : undefined;
  const numeric = number && !('format' in number) ? number : undefined;
  const {
    thousandSeparator: _separator,
    decimalSeparator: _decimal,
    suffix: _suffix,
    prefix: _prefix,
    ...numericOptions
  } = numeric ?? {};
  const format = useEvalExpression(pattern?.format, CommonExpressions.PatternFormatProps.format);
  const separator = useEvalExpression(
    numeric?.thousandSeparator,
    CommonExpressions.NumberFormatProps.thousandSeparator,
  );
  const decimalSeparator = useEvalExpression(
    numeric?.decimalSeparator,
    CommonExpressions.NumberFormatProps.decimalSeparator,
  );
  const suffix = useEvalExpression(numeric?.suffix, CommonExpressions.NumberFormatProps.suffix);
  const prefix = useEvalExpression(numeric?.prefix, CommonExpressions.NumberFormatProps.prefix);
  const thousandSeparator = typeof separator === 'string' || typeof separator === 'boolean' ? separator : false;

  if (!formatting) {
    return undefined;
  }
  return {
    ...formatting,
    number: pattern
      ? { ...pattern, format }
      : numeric
        ? {
            ...numericOptions,
            ...(numeric.thousandSeparator !== undefined ? { thousandSeparator } : {}),
            ...(numeric.decimalSeparator !== undefined ? { decimalSeparator } : {}),
            ...(numeric.suffix !== undefined ? { suffix } : {}),
            ...(numeric.prefix !== undefined ? { prefix } : {}),
          }
        : undefined,
  };
}
