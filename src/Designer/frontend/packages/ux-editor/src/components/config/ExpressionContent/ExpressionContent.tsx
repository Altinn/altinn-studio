import type { ReactNode } from 'react';
import { useId, useMemo } from 'react';
import { getComponentIds, getDataModelElementNames } from '../../../utils/expressionsUtils';
import type { Expression, DataLookupOptions } from '@studio/components';
import { DataLookupFuncName, StudioConfigCard } from '@studio/components';
import { useFormLayoutsQuery } from '../../../hooks/queries/useFormLayoutsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useDataModelMetadataQuery } from '../../../hooks/queries/useDataModelMetadataQuery';
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
  const headingId = useId();
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
    <StudioConfigCard
      role='group'
      aria-labelledby={headingId}
      className={classes.expressionContent}
    >
      <StudioConfigCard.Header
        cardLabel={heading}
        cardLabelId={headingId}
        isDeleteDisabled={!expression}
        deleteAriaLabel={t('right_menu.expression_delete')}
        confirmDeleteMessage={t('right_menu.expressions_delete_confirm')}
        onDelete={onDelete}
      />
      <StudioConfigCard.Body>
        <ExpressionWithTexts
          expression={expression}
          onChange={onChange}
          dataLookupOptions={dataLookupOptions}
        />
      </StudioConfigCard.Body>
    </StudioConfigCard>
  );
};
