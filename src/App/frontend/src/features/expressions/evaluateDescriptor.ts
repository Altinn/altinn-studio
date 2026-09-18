import type { ExpressionDescriptor } from '@app/layout-contract';

import { evalExpr } from 'src/features/expressions';
import { ExprValidation } from 'src/features/expressions/validation';
import type { EvalExprOptions } from 'src/features/expressions';
import type { ExpressionDataSources } from 'src/features/expressions/runtime/useExpressionDataSources';
import type { ExprVal, ExprValToActual, ExprValToActualOrExpr } from 'src/features/expressions/types';

export type ExpressionRuntimeOptions<V extends ExprVal> = Omit<
  EvalExprOptions<V>,
  'returnType' | 'defaultValue' | 'errorIntroText'
>;

/** Applies descriptor validation, diagnostics and fallbacks using the supplied runtime context. */
export function evaluateDescriptor<V extends ExprVal>(
  expr: ExprValToActualOrExpr<V> | undefined,
  descriptor: ExpressionDescriptor<V>,
  dataSources: ExpressionDataSources,
  componentId?: string,
  runtimeOptions?: ExpressionRuntimeOptions<V>,
): ExprValToActual<V> {
  const options = {
    ...descriptor,
    ...runtimeOptions,
    errorIntroText: componentId
      ? `${descriptor.errorIntroText} (component '${componentId}')`
      : descriptor.errorIntroText,
  };
  if (expr === undefined || !ExprValidation.isValidOrScalar(expr, descriptor.returnType, options.errorIntroText)) {
    return descriptor.defaultValue;
  }
  return evalExpr(expr, dataSources, options);
}
