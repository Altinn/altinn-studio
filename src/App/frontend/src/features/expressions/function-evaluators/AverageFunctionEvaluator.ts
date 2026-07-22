import { Decimal } from 'src/features/expressions/Decimal';
import { FunctionEvaluator } from 'src/features/expressions/function-evaluators/FunctionEvaluator';
import { convertArrayToNumberList } from 'src/features/expressions/function-evaluators/number-list-utils';
import type { EvaluateExpressionParams } from 'src/features/expressions';
import type { ValidArray } from 'src/features/expressions/types';

export class AverageFunctionEvaluator extends FunctionEvaluator<[ValidArray | null, number | null], number | null> {
  constructor(context: EvaluateExpressionParams<never[]>, argumentList: [ValidArray | null, number | null]) {
    super(context, argumentList);
  }

  evaluate(): number | null {
    const numberList = this.numberList();
    return AverageFunctionEvaluator.hasAtLeastOneItem(numberList)
      ? Decimal.average(numberList)
      : this.fallbackForEmptyList;
  }

  private numberList(): number[] {
    return convertArrayToNumberList(this.list, this.context);
  }

  private get list(): ValidArray {
    return this.argumentList[0] || [];
  }

  private static hasAtLeastOneItem(list: number[]): list is [number, ...number[]] {
    return list.length > 0;
  }

  private get fallbackForEmptyList(): number | null {
    return this.argumentList[1];
  }
}
