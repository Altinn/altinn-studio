import type { ExprResolved, ExprVal } from 'src/features/expressions/types';
import type { IFormatting, PatternFormatProps } from 'src/layout/common.generated';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export function evalFormatting(props: ExprResolver<'Input' | 'Number'>) {
  if (!props.item.formatting) {
    return undefined;
  }

  const { evalStr, evalAny } = props;
  const out = { ...props.item.formatting } as ExprResolved<IFormatting>;
  if (out.number && 'format' in out.number) {
    out.number = {
      ...(out.number as PatternFormatProps),
      format: evalStr(out.number.format, ''),
    };
  } else if (out.number) {
    out.number = { ...out.number };

    if (out.number!.thousandSeparator) {
      out.number.thousandSeparator = evalAny(out.number.thousandSeparator as ExprVal.Any, false) as
        | string
        | boolean
        | undefined;
    }
    if (out.number.decimalSeparator) {
      out.number.decimalSeparator = evalStr(out.number.decimalSeparator, '.');
    }
    if (out.number.suffix) {
      out.number.suffix = evalStr(out.number.suffix, '');
    }
    if (out.number.prefix) {
      out.number.prefix = evalStr(out.number.prefix, '');
    }
  }

  return out;
}
