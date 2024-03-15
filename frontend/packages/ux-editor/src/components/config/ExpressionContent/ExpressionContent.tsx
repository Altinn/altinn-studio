import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { getComponentIds, getDataModelElementNames } from '../../../utils/expressionsUtils';
import type { Expression, DataLookupOptions } from '@studio/components';
import { DataLookupFuncName, StudioDeleteButton } from '@studio/components';
import { useFormLayoutsQuery } from '../../../hooks/queries/useFormLayoutsQuery';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppContext } from '../../../hooks/useAppContext';
import { useDatamodelMetadataQuery } from '../../../hooks/queries/useDatamodelMetadataQuery';
import { Paragraph } from '@digdir/design-system-react';
import classes from './ExpressionContent.module.css';
import { useText } from '../../../hooks';
import { Expression as ExpressionWithTexts } from 'app-shared/components/Expression';

export interface ExpressionContentProps {
  expression: Expression;
  onChange: (expression: Expression) => void;
  onDelete: () => void;
  heading: ReactNode;
}

export const ExpressionContent = ({
  expression,
  onChange,
  onDelete,
  heading,
}: ExpressionContentProps) => {
  const t = useText();
  const { org, app } = useStudioUrlParams();
  const { selectedLayoutSet } = useAppContext();
  const { data: formLayoutsData } = useFormLayoutsQuery(org, app, selectedLayoutSet);
  const { data: datamodelMetadata } = useDatamodelMetadataQuery(org, app, selectedLayoutSet);

  const dataLookupOptions: DataLookupOptions = useMemo(
    () => ({
      [DataLookupFuncName.Component]: getComponentIds(formLayoutsData),
      [DataLookupFuncName.DataModel]: getDataModelElementNames(datamodelMetadata),
    }),
    [formLayoutsData, datamodelMetadata],
  );

  return (
    <fieldset className={classes.expressionContent}>
      <legend className={classes.legend}>
        <Paragraph className={classes.legendContent} size='small'>
          {heading}
        </Paragraph>
      </legend>
      <StudioDeleteButton
        className={classes.deleteButton}
        confirmMessage={t('right_menu.expressions_delete_confirm')}
        onDelete={onDelete}
        size='small'
        title={t('right_menu.expression_delete')}
      />
      <div className={classes.expressionWrapper}>
        <ExpressionWithTexts
          expression={expression}
          onChange={onChange}
          dataLookupOptions={dataLookupOptions}
        />
      </div>
    </fieldset>
  );
};
