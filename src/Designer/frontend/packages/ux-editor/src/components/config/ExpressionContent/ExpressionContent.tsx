import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { getComponentIds, getDataModelElementNames } from '../../../utils/expressionsUtils';
import type { Expression, DataLookupOptions } from '@studio/components';
import { DataLookupFuncName, StudioDeleteButton } from '@studio/components';
import { useFormLayoutsQuery } from '../../../hooks/queries/useFormLayoutsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useDataModelMetadataQuery } from '../../../hooks/queries/useDataModelMetadataQuery';
import { Paragraph } from '@digdir/designsystemet-react';
import classes from './ExpressionContent.module.css';
import { Expression as ExpressionWithTexts } from './Expression';
import { useText } from '../../../hooks';
import useUxEditorParams from '@altinn/ux-editor/hooks/useUxEditorParams';

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
  const { org, app } = useStudioEnvironmentParams();
  const { layoutSet } = useUxEditorParams();
  const { data: formLayoutsData } = useFormLayoutsQuery(org, app, layoutSet);
  const { data: dataModelMetadata } = useDataModelMetadataQuery({
    org,
    app,
    layoutSetName: layoutSet,
  });
  const dataLookupOptions: Partial<DataLookupOptions> = useMemo(
    () => ({
      [DataLookupFuncName.Component]: getComponentIds(formLayoutsData),
      [DataLookupFuncName.DataModel]: getDataModelElementNames(dataModelMetadata),
    }),
    [formLayoutsData, dataModelMetadata],
  );

  return (
    <fieldset className={classes.expressionContent}>
      <legend className={classes.legend}>
        <Paragraph className={classes.legendContent} size='small'>
          {heading}
        </Paragraph>
      </legend>
      {expression && (
        <StudioDeleteButton
          className={classes.deleteButton}
          confirmMessage={t('right_menu.expressions_delete_confirm')}
          onDelete={onDelete}
          data-size='2xs'
          title={t('right_menu.expression_delete')}
        />
      )}
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
