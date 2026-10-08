import { CommonExpressions } from '@app/layout-contract/generated/expressions.generated';
import type { IQueryParameters } from '@app/layout-contract/generated/common.generated';

import { useShallowMemo } from 'src/hooks/useShallowMemo';
import { useEvalExpressionDictionary } from 'src/utils/layout/useEvalExpression';

export function useResolvedQueryParameters(queryParameters: IQueryParameters | undefined) {
  const resolved = useEvalExpressionDictionary(
    queryParameters,
    CommonExpressions.IQueryParameters.additionalProperties,
  );
  // Equal resolved strings preserve identity until a value changes.
  const stable = useShallowMemo(resolved ?? {});
  return resolved ? stable : undefined;
}
