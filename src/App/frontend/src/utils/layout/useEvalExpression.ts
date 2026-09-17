import { useMemo } from 'react';

import type { ExpressionDescriptor } from '@app/layout-contract';

import { evalExpr } from 'src/features/expressions';
import { useExpressionDataSources } from 'src/features/expressions/runtime/useExpressionDataSources';
import { ExprValidation } from 'src/features/expressions/validation';
import { useShallowMemo } from 'src/hooks/useShallowMemo';
import { useCurrentComponentId } from 'src/layout/FormComponentContext';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import type { EvalExprOptions } from 'src/features/expressions';
import type { ExprVal, ExprValToActual, ExprValToActualOrExpr } from 'src/features/expressions/types';

/**
 * Evaluates one property at the current data model location. Component properties can use generated descriptors:
 * `useEvalExpression(config.required, Expressions.Input.required)`.
 */
export function useEvalExpression<V extends ExprVal>(
  expr: ExprValToActualOrExpr<V> | undefined,
  descriptor: ExpressionDescriptor<V>,
  runtimeOptions?: Omit<EvalExprOptions<V>, 'returnType' | 'defaultValue' | 'errorIntroText'>,
): ExprValToActual<V> {
  const dataSources = useExpressionDataSources(expr);
  const baseComponentId = useCurrentComponentId();
  const componentId = useIndexedId(baseComponentId);
  const errorIntroText = baseComponentId
    ? `${descriptor.errorIntroText} (component '${componentId}')`
    : descriptor.errorIntroText;
  const options = useShallowMemo({ ...descriptor, ...runtimeOptions, errorIntroText });
  return useMemo(() => {
    if (expr === undefined || !ExprValidation.isValidOrScalar(expr, options.returnType, options.errorIntroText)) {
      return options.defaultValue;
    }

    return evalExpr(expr, dataSources, options);
  }, [dataSources, expr, options]);
}

type ExpressionInputs<D extends Record<string, ExpressionDescriptor>> = {
  [K in keyof D]?: ExprValToActualOrExpr<D[K]['returnType']>;
};
type ExpressionResults<D extends Record<string, ExpressionDescriptor>> = {
  [K in keyof D]?: ExprValToActual<D[K]['returnType']>;
};

/** Use when the consumer needs every configured entry, such as texts passed to a custom web component. */
export function useEvalExpressionMap<D extends Record<string, ExpressionDescriptor>>(
  expressions: ExpressionInputs<D> | undefined,
  descriptors: D,
): ExpressionResults<D> | undefined {
  const dataSources = useExpressionDataSources(expressions);
  const componentId = useIndexedId(useCurrentComponentId());
  return useMemo(() => {
    if (!expressions) {
      return undefined;
    }
    const result: Record<string, unknown> = {};
    for (const [key, expr] of Object.entries(expressions)) {
      const descriptor = descriptors[key];
      const options = {
        ...descriptor,
        errorIntroText: componentId
          ? `${descriptor.errorIntroText} (component '${componentId}')`
          : descriptor.errorIntroText,
      };
      result[key] =
        expr === undefined || !ExprValidation.isValidOrScalar(expr, descriptor.returnType, options.errorIntroText)
          ? descriptor.defaultValue
          : evalExpr(expr, dataSources, options);
    }
    return result as ExpressionResults<D>;
  }, [componentId, dataSources, descriptors, expressions]);
}

/** Evaluates dictionary entries that share a generated descriptor. */
export function useEvalExpressionDictionary<V extends ExprVal>(
  expressions: Record<string, ExprValToActualOrExpr<V> | undefined> | undefined,
  descriptor: ExpressionDescriptor<V>,
): Record<string, ExprValToActual<V>> | undefined {
  const descriptors = useMemo(
    () => Object.fromEntries(Object.keys(expressions ?? {}).map((key) => [key, descriptor])),
    [descriptor, expressions],
  );
  return useEvalExpressionMap(expressions, descriptors) as Record<string, ExprValToActual<V>> | undefined;
}
