import { Decimal } from 'src/features/expressions/Decimal';
import { FunctionEvaluator } from 'src/features/expressions/function-evaluators/FunctionEvaluator';
import { convertArrayToNumberList } from 'src/features/expressions/function-evaluators/number-list-utils';
import type { EvaluateExpressionParams } from 'src/features/expressions';
import type { ValidArray } from 'src/features/expressions/types';

export class SumFunctionEvaluator extends FunctionEvaluator<[ValidArray | null], number> {
  constructor(context: EvaluateExpressionParams, argumentList: [ValidArray | null]) {
    super(context, argumentList);
  }

  evaluate(): number {
    return Decimal.sum(this.numberList);
  }

  private get numberList(): number[] {
    return convertArrayToNumberList(this.list, this.context);
  }

  private get list(): ValidArray {
    return this.argumentList[0] || [];
  }
}
