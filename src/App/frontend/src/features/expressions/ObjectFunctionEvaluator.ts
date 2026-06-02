import { ExprRuntimeError } from 'src/features/expressions/errors';
import { areStringsUnique, consistsOfStringsOnly, zipArrays } from 'src/utils/arrayUtils';
import type { EvaluateExpressionParams } from 'src/features/expressions';
import type { ValidObject, ValidValue } from 'src/features/expressions/types';

export class ObjectFunctionEvaluator {
  #context: EvaluateExpressionParams<never[]>;
  #items: ValidValue[];

  constructor(context: EvaluateExpressionParams<never[]>, items: ValidValue[]) {
    this.#context = context;
    this.#items = items;
  }

  evaluate(): ValidObject {
    this.assertEvenNumberOfArguments();
    const keys = this.extractAndVerifyKeys();
    const values = this.extractOddIndexedArguments();
    return ObjectFunctionEvaluator.objectFromKeysAndValues(keys, values);
  }

  private assertEvenNumberOfArguments(): void {
    if (this.#items.length % 2 === 1) {
      throw new ExprRuntimeError(
        this.#context.expr,
        this.#context.path,
        'The object function must have an even number of arguments',
      );
    }
  }

  private extractAndVerifyKeys(): string[] {
    const keys = this.extractEvenIndexedArguments();
    if (!consistsOfStringsOnly(keys)) {
      throw new ExprRuntimeError(this.#context.expr, this.#context.path, 'Object keys must be strings');
    }
    if (!areStringsUnique(keys)) {
      throw new ExprRuntimeError(this.#context.expr, this.#context.path, 'Object keys must be unique');
    }
    return keys;
  }

  private extractEvenIndexedArguments(): ValidValue[] {
    return this.#items.filter((_, index) => index % 2 === 0);
  }

  private extractOddIndexedArguments(): ValidValue[] {
    return this.#items.filter((_, index) => index % 2 === 1);
  }

  private static objectFromKeysAndValues(keys: string[], values: ValidValue[]): Record<string, ValidValue> {
    const entries = zipArrays<string, ValidValue>(keys, values);
    return Object.fromEntries(entries);
  }
}
