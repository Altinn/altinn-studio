import { exprCastValue } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import type { EvaluateExpressionParams } from 'src/features/expressions';
import type { ValidArray, ValidValue } from 'src/features/expressions/types';

export function convertArrayToNumberList(list: ValidArray, context: EvaluateExpressionParams<never[]>): number[] {
  return list.map((value: ValidValue): number => {
    const result = exprCastValue<ExprVal.Number>(value, ExprVal.Number, context);
    return result || 0;
  });
}
