import React from 'react';

import { CommonExpressions } from '@app/layout-contract/generated/expressions.generated';
import type { IGroupColumnFormatting } from '@app/layout-contract/generated/components/RepeatingGroup/config.generated';

import { FormStore } from 'src/features/form/FormContext';
import { Lang } from 'src/features/language/Lang';
import { useRepeatingGroupComponentId } from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import classes from 'src/layout/RepeatingGroup/RepeatingGroup.module.css';
import { useColumnStylesRepeatingGroups } from 'src/utils/formComponentUtils';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import { useLabel } from 'src/utils/layout/useLabel';

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
  const config = useComponentConfig(groupComponentId, 'RepeatingGroup');
  const editInTable = columnSettings[baseComponentId]?.editInTable;
  const isOnlyTable = config.edit?.mode === 'onlyTable';
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

  const tableTitle = useEvalExpression(
    textResourceBindings && 'tableTitle' in textResourceBindings ? textResourceBindings.tableTitle : '',
    CommonExpressions.TRBFormComp.tableTitle,
  );
  const title = useEvalExpression(
    textResourceBindings && 'title' in textResourceBindings ? textResourceBindings.title : '',
    CommonExpressions.TRBLabel.title,
  );

  return tableTitle || title || '';
}
