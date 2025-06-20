import React from 'react';

import { ExprVal } from 'src/features/expressions/types';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import { useColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import { useEvalExpression } from 'src/utils/layout/generator/useEvalExpression';
import type { EvalExprOptions } from 'src/features/expressions';
import type { ITableColumnFormatting } from 'src/layout/common.generated';

interface IProps {
  baseComponentId: string;
  columnSettings: ITableColumnFormatting;
}

export const RepeatingGroupTableTitle = ({ baseComponentId, columnSettings }: IProps) => {
  const style = useColumnStylesRepeatingGroups(baseComponentId, columnSettings);
  const tableTitle = useTableTitle(baseComponentId);
  return (
    <span
      className={classes.contentFormatting}
      style={style}
    >
      <Lang id={tableTitle} />
    </span>
  );
};

export function useTableTitle(baseComponentId: string): string {
  const textResourceBindings = useLayoutLookups().getComponent(baseComponentId).textResourceBindings;
  const exprOptions: EvalExprOptions<ExprVal.String> = {
    returnType: ExprVal.String,
    defaultValue: '',
    errorIntroText: `Invalid expression in ${baseComponentId}`,
  };
  const tableTitle = useEvalExpression(
    textResourceBindings && 'tableTitle' in textResourceBindings ? textResourceBindings.tableTitle : '',
    exprOptions,
  );
  const title = useEvalExpression(
    textResourceBindings && 'title' in textResourceBindings ? textResourceBindings.title : '',
    exprOptions,
  );

  return tableTitle || title || '';
}
