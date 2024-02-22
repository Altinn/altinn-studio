import React, { useContext, useMemo } from 'react';
import type { ExpressionProperty } from '../../../../types/Expressions';
import {
  getComponentIds,
  getDataModelElementNames,
  getExternalExpressionOnComponentProperty,
  updateFormItemWithExpression,
} from '../../../../utils/expressionsUtils';
import type { FormComponent } from '../../../../types/FormComponent';
import type { FormContainer } from '../../../../types/FormContainer';
import { FormItemContext } from '../../../../containers/FormItemContext';
import type { Expression, DataLookupOptions } from '@studio/components';
import { DataLookupFuncName, StudioExpression } from '@studio/components';
import { useFormLayoutsQuery } from '../../../../hooks/queries/useFormLayoutsQuery';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppContext } from '../../../../hooks/useAppContext';
import { useDatamodelMetadataQuery } from '../../../../hooks/queries/useDatamodelMetadataQuery';
import { Card, Heading } from '@digdir/design-system-react';
import classes from './ExpressionContent.module.css';
import { useExpressionTexts } from 'app-shared/hooks/useExpressionTexts';
import { expressionInPreviewPropertyTextKeys } from '../../../../types/Expressions';
import { Trans } from 'react-i18next';

export interface ExpressionContentProps {
  property: ExpressionProperty;
  defaultEditMode: boolean;
  onDeleteExpression: (property: ExpressionProperty) => void;
}

export const ExpressionContent = ({
  property,
  defaultEditMode,
  onDeleteExpression,
}: ExpressionContentProps) => {
  const { org, app } = useStudioUrlParams();
  const { selectedLayoutSet } = useAppContext();
  const { data: formLayoutsData } = useFormLayoutsQuery(org, app, selectedLayoutSet);
  const { data: datamodelMetadata } = useDatamodelMetadataQuery(org, app);
  const { formItemId, formItem, handleUpdate, handleSave } = useContext(FormItemContext);
  const externalExpression = getExternalExpressionOnComponentProperty(formItem, property);
  const expressionTexts = useExpressionTexts();

  const updateAndSaveLayout = async (updatedComponent: FormComponent | FormContainer) => {
    handleUpdate(updatedComponent);
    await handleSave(formItemId, updatedComponent);
  };

  const updateExpression = async (exp: Expression) => {
    const updatedComponent = updateFormItemWithExpression(form, exp, property);
    await updateAndSaveLayout(updatedComponent);
  };

  const dataLookupOptions: DataLookupOptions = useMemo(
    () => ({
      [DataLookupFuncName.Component]: getComponentIds(formLayoutsData),
      [DataLookupFuncName.DataModel]: getDataModelElementNames(datamodelMetadata),
    }),
    [formLayoutsData, datamodelMetadata],
  );

  return (
    <Card className={classes.expressionContent}>
      <Card.Header className={classes.expressionHeader}>
        <Heading level={4} size='xxsmall'>
          <Trans
            i18nKey={expressionInPreviewPropertyTextKeys[property]}
            values={{ componentName: formId }}
            components={{ bold: <strong /> }}
          />
        </Heading>
      </Card.Header>
      <Card.Content style={{ padding: 0 }}>
        <StudioExpression
          expression={externalExpression}
          onChange={updateExpression}
          dataLookupOptions={dataLookupOptions}
          texts={expressionTexts}
        />
      </Card.Content>
    </Card>
  );
};
