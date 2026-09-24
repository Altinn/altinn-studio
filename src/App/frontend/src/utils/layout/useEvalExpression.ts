import { useMemo } from 'react';

import type { ExpressionDescriptor } from '@app/layout-contract';

import { evaluateDescriptor } from 'src/features/expressions/evaluateDescriptor';
import { useExpressionDataSources } from 'src/features/expressions/runtime/useExpressionDataSources';
import { useShallowMemo } from 'src/hooks/useShallowMemo';
import { useCurrentComponentId } from 'src/layout/FormComponentContext';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import type { ExpressionRuntimeOptions } from 'src/features/expressions/evaluateDescriptor';
import type { ExprVal, ExprValToActual, ExprValToActualOrExpr } from 'src/features/expressions/types';

/**
 * Evaluates one property at the current data model location. Component properties can use generated descriptors:
 * `useEvalExpression(config.required, Expressions.Input.required)`.
 */
export function useEvalExpression<V extends ExprVal>(
  expr: ExprValToActualOrExpr<V> | undefined,
  descriptor: ExpressionDescriptor<V>,
  runtimeOptions?: ExpressionRuntimeOptions<V>,
): ExprValToActual<V> {
  const dataSources = useExpressionDataSources(expr);
  const baseComponentId = useCurrentComponentId();
  const componentId = useIndexedId(baseComponentId);
  const stableDescriptor = useShallowMemo(descriptor);
  const options = useShallowMemo(runtimeOptions ?? {});
  return useMemo(
    () => evaluateDescriptor(expr, stableDescriptor, dataSources, baseComponentId ? componentId : undefined, options),
    [baseComponentId, componentId, dataSources, stableDescriptor, expr, options],
  );
}

/** Preserves absent text bindings while configured expressions retain their descriptor fallback. */
export function useEvalOptionalText(
  expr: ExprValToActualOrExpr<ExprVal.String> | undefined,
  descriptor: ExpressionDescriptor<ExprVal.String>,
): string | undefined {
  const value = useEvalExpression(expr, descriptor);
  return expr === undefined ? undefined : value;
}

/** Evaluates an optional text binding on a component whose bindings vary by type. */
export function useEvalOptionalTrb<
  D extends Record<string, ExpressionDescriptor<ExprVal.String>>,
  K extends keyof D & string,
>(config: { textResourceBindings?: object }, key: K, descriptors: D): string | undefined {
  const bindings = config.textResourceBindings;
  const expression = bindings && key in bindings ? (bindings as Record<string, unknown>)[key] : undefined;
  return useEvalOptionalText(expression as ExprValToActualOrExpr<ExprVal.String> | undefined, descriptors[key]);
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
      result[key] = evaluateDescriptor(expr, descriptor, dataSources, componentId);
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
