import { ExprRuntimeError } from 'src/features/expressions/errors';
import type { EvaluateExpressionParams } from 'src/features/expressions';
import type { ValidValue } from 'src/features/expressions/types';

export abstract class FunctionEvaluator<
  Arguments extends ValidValue[] = ValidValue[],
  ReturnValue extends ValidValue = ValidValue,
> {
  readonly #context: EvaluateExpressionParams<never[]>;
  readonly #argumentList: Arguments;

  protected constructor(context: EvaluateExpressionParams<never[]>, argumentList: Arguments) {
    this.#context = context;
    this.#argumentList = argumentList;
  }

  protected get context(): EvaluateExpressionParams<never[]> {
    return this.#context;
  }

  protected get argumentList(): Arguments {
    return this.#argumentList;
  }

  abstract evaluate(): ReturnValue;

  protected throwRuntimeException(message: string): never {
    throw new ExprRuntimeError(this.#context.expr, this.#context.path, message);
  }
}
