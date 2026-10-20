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

export type DescriptorExpression<D extends ExpressionDescriptor> = D['returnType'] extends ExprVal.Any
  ? ExprValToActualOrExpr<ExprVal>
  : ExprValToActualOrExpr<D['returnType']>;

/** Applies descriptor validation, diagnostics and fallbacks using the supplied runtime context. */
export function evaluateDescriptor<D extends ExpressionDescriptor>(
  expr: DescriptorExpression<D> | undefined,
  descriptor: D,
  dataSources: ExpressionDataSources,
  componentId?: string,
  runtimeOptions?: ExpressionRuntimeOptions<D['returnType']>,
): ExprValToActual<D['returnType']> | D['defaultValue'] {
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
  return evalExpr(expr as ExprValToActualOrExpr<D['returnType']>, dataSources, options);
}
