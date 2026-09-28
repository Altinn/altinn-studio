import type { IQueryParameters } from '@app/layout-contract/generated/common.generated';

import { evalExpr } from 'src/features/expressions';
import { useExpressionDataSources } from 'src/features/expressions/runtime/useExpressionDataSources';
import { ExprVal } from 'src/features/expressions/types';
import { useShallowMemo } from 'src/hooks/useShallowMemo';
import type { ExprResolved } from 'src/features/expressions/types';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export function evalQueryParameters(props: ExprResolver<'List'>) {
  if (!props.item.queryParameters) {
    return undefined;
  }

  const { evalStr } = props;
  const out = { ...props.item.queryParameters } as ExprResolved<IQueryParameters>;
  for (const [key, value] of Object.entries(out)) {
    out[key] = evalStr(value, '');
  }
  return out;
}

export function useResolvedQueryParameters(
  queryParameters: IQueryParameters | undefined,
): Record<string, string> | undefined {
  const dataSources = useExpressionDataSources(queryParameters);
  // The resolved values are strings, so shallow comparison preserves identity until a value changes.
  const resolved = useShallowMemo(
    queryParameters
      ? Object.entries(queryParameters).reduce<Record<string, string>>((obj, [key, expr]) => {
          obj[key] = evalExpr(expr, dataSources, {
            returnType: ExprVal.String,
            defaultValue: '',
            errorIntroText: `Invalid expression in query parameters`,
          });
          return obj;
        }, {})
      : {},
  );
  return queryParameters ? resolved : undefined;
}
