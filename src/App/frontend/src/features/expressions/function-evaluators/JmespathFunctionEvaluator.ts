import jmespath from 'jmespath';

import { FunctionEvaluator } from 'src/features/expressions/function-evaluators/FunctionEvaluator';
import { assertValidValue } from 'src/features/expressions/validation';
import type { EvaluateExpressionParams } from 'src/features/expressions';
import type { ValidValue } from 'src/features/expressions/types';

export class JmespathFunctionEvaluator extends FunctionEvaluator<[ValidValue, string | null]> {
  constructor(context: EvaluateExpressionParams<never[]>, argumentList: [ValidValue, string | null]) {
    super(context, argumentList);
  }

  evaluate(): ValidValue {
    const result = this.trySearch();
    assertValidValue(result);
    return result;
  }

  private trySearch(): unknown {
    const { data, query } = this;
    try {
      return jmespath.search(data, query);
    } catch (error: unknown) {
      this.throwRuntimeException(`Jmespath error`);
    }
  }

  private get data(): ValidValue {
    return this.argumentList[0];
  }

  private get query(): string {
    const query = this.argumentList[1];
    if (typeof query === 'string') {
      return query;
    } else {
      this.throwRuntimeException('Expected argument to be string');
    }
  }
}
