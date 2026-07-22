import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { useExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import type { ExprResolved } from 'src/features/expressions/types';
import type { IQueryParameters } from 'src/layout/common.generated';
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
  return queryParameters
    ? Object.entries(queryParameters).reduce((obj, [key, expr]) => {
        obj[key] = evalExpr(expr, dataSources, {
          returnType: ExprVal.String,
          defaultValue: '',
          errorIntroText: `Invalid expression in query parameters`,
        });
        return obj;
      }, {})
    : undefined;
}
