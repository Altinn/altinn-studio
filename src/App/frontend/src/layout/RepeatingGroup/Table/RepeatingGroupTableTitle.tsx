import React from 'react';

import { ExprVal } from 'src/features/expressions/types';
import { FormStore } from 'src/features/form/FormContext';
import { Lang } from 'src/features/language/Lang';
import { useRepeatingGroupComponentId } from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import classes from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import { useColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import { useEvalExpression } from 'src/utils/layout/generator/useEvalExpression';
import { useLabel } from 'src/utils/layout/useLabel';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { EvalExprOptions } from 'src/features/expressions';
import type { IGroupColumnFormatting } from 'src/layout/RepeatingGroup/config.generated';

interface IProps {
  baseComponentId: string;
  columnSettings: IGroupColumnFormatting;
}

export const RepeatingGroupTableTitle = ({ baseComponentId, columnSettings }: IProps) => {
  const style = useColumnStylesRepeatingGroups(baseComponentId, columnSettings, true);
  const tableTitle = useTableTitle(baseComponentId);
  const { getRequiredComponent, getOptionalComponent } = useLabel({
    baseComponentId,
    overrideDisplay: undefined,
  });
  const groupComponentId = useRepeatingGroupComponentId();
  const { edit } = useItemWhenType(groupComponentId, 'RepeatingGroup');
  const editInTable = columnSettings[baseComponentId]?.editInTable;
  const isOnlyTable = edit?.mode === 'onlyTable';
  const showIndicators = editInTable || (isOnlyTable && editInTable !== false);
  return (
    <span
      className={classes.contentFormatting}
      style={style}
    >
      <Lang id={tableTitle} />
      {showIndicators && getRequiredComponent()}
      {showIndicators && getOptionalComponent()}
    </span>
  );
};

export function useTableTitle(baseComponentId: string): string {
  const textResourceBindings = FormStore.bootstrap
    .useLayoutLookups()
    .getComponent(baseComponentId).textResourceBindings;
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
