import { FunctionEvaluator } from 'src/features/expressions/function-evaluators/FunctionEvaluator';
import { areStringsUnique, consistsOfStringsOnly, zipArrays } from 'src/utils/arrayUtils';
import type { EvaluateExpressionParams } from 'src/features/expressions';
import type { ValidObject, ValidValue } from 'src/features/expressions/types';

export class ObjectFunctionEvaluator extends FunctionEvaluator<ValidValue[], ValidObject> {
  constructor(context: EvaluateExpressionParams<never[]>, argumentList: ValidValue[]) {
    super(context, argumentList);
  }

  evaluate(): ValidObject {
    const keys = this.extractAndVerifyKeys();
    const values = this.extractOddIndexedArguments();
    return ObjectFunctionEvaluator.objectFromKeysAndValues(keys, values);
  }

  private extractAndVerifyKeys(): string[] {
    const keys = this.extractEvenIndexedArguments();
    if (!consistsOfStringsOnly(keys)) {
      this.throwRuntimeException('Object keys must be strings');
    }
    if (!areStringsUnique(keys)) {
      this.throwRuntimeException('Object keys must be unique');
    }
    return keys;
  }

  private extractEvenIndexedArguments(): ValidValue[] {
    return this.argumentList.filter((_, index) => index % 2 === 0);
  }

  private extractOddIndexedArguments(): ValidValue[] {
    return this.argumentList.filter((_, index) => index % 2 === 1);
  }

  private static objectFromKeysAndValues(keys: string[], values: ValidValue[]): Record<string, ValidValue> {
    const entries = zipArrays<string, ValidValue>(keys, values);
    return Object.fromEntries(entries);
  }
}
