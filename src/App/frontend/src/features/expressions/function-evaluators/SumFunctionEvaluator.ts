import { exprCastValue } from 'src/features/expressions';
import { Decimal } from 'src/features/expressions/Decimal';
import { FunctionEvaluator } from 'src/features/expressions/function-evaluators/FunctionEvaluator';
import { ExprVal } from 'src/features/expressions/types';
import type { EvaluateExpressionParams } from 'src/features/expressions';
import type { ValidArray, ValidValue } from 'src/features/expressions/types';

export class SumFunctionEvaluator extends FunctionEvaluator<[ValidArray | null], number> {
  constructor(context: EvaluateExpressionParams<never[]>, argumentList: [ValidArray | null]) {
    super(context, argumentList);
  }

  evaluate(): number {
    return Decimal.sum(this.numberList);
  }

  private get numberList(): number[] {
    return this.list.map(this.convertValueToNumber);
  }

  private get list(): ValidArray {
    return this.argumentList[0] || [];
  }

  private convertValueToNumber = (value: ValidValue): number => {
    const result = exprCastValue<ExprVal.Number>(value, ExprVal.Number, this.context);
    return result || 0;
  };
}
