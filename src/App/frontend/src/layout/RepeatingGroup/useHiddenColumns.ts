import { useMemo } from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import type { ITableColumnFormatting } from '@app/layout-contract/generated/common.generated';

import { useEvalExpressionDictionary } from 'src/utils/layout/useEvalExpression';

/** Column visibility belongs to the group location, before entering an individual row. */
export function useHiddenColumns(columns: ITableColumnFormatting | undefined): string[] {
  const expressions = useMemo(
    () => Object.fromEntries(Object.entries(columns ?? {}).map(([id, column]) => [id, column.hidden])),
    [columns],
  );
  const hidden = useEvalExpressionDictionary(
    expressions,
    Expressions.RepeatingGroup.tableColumns.additionalProperties.hidden,
  );
  return useMemo(() => Object.keys(hidden ?? {}).filter((id) => hidden?.[id] === true), [hidden]);
}
