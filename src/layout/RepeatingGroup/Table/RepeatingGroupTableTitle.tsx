import React from 'react';

import { ExprVal } from 'src/features/expressions/types';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import { useColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import { useEvalExpression } from 'src/utils/layout/generator/useEvalExpression';
import { useLabel } from 'src/utils/layout/useLabel';
import type { EvalExprOptions } from 'src/features/expressions';
import type { IGroupColumnFormatting } from 'src/layout/RepeatingGroup/config.generated';

interface IProps {
  baseComponentId: string;
  columnSettings: IGroupColumnFormatting;
}

export const RepeatingGroupTableTitle = ({ baseComponentId, columnSettings }: IProps) => {
  const style = useColumnStylesRepeatingGroups(baseComponentId, columnSettings);
  const tableTitle = useTableTitle(baseComponentId);
  const { getRequiredComponent, getOptionalComponent } = useLabel({
    baseComponentId,
    overrideDisplay: undefined,
  });
  const editInTable = columnSettings[baseComponentId]?.editInTable;
  return (
    <span
      className={classes.contentFormatting}
      style={style}
    >
      <Lang id={tableTitle} />
      {editInTable && getRequiredComponent()}
      {editInTable && getOptionalComponent()}
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
