import React from 'react';
import { ExpressionContent } from '../../config/ExpressionContent';
import type { Expression } from '@studio/components';
import type { IInternalLayout } from '../../../types/global';
import { deepCopy } from 'app-shared/pure';
import { useFormLayoutMutation } from '../../../hooks/mutations/useFormLayoutMutation';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useSelectedFormLayoutWithName } from '../../../hooks';
import { useSelectedLayoutSetName } from '../../../hooks/useSelectedLayoutSetName';
import { Trans } from 'react-i18next';

export const HiddenExpressionOnLayout = () => {
  const { app, org } = useStudioUrlParams();
  const { layout, layoutName } = useSelectedFormLayoutWithName();
  const { selectedLayoutSetName } = useSelectedLayoutSetName();
  const { mutate: saveLayout } = useFormLayoutMutation(org, app, layoutName, selectedLayoutSetName);
  const handleChangeHiddenExpressionOnLayout = async (expression: Expression) => {
    const updatedLayout: IInternalLayout = deepCopy(layout);
    saveLayout({ ...updatedLayout, hidden: expression });
  };

  const handleDeleteHiddenExpressionOnLayout = async () => {
    const updatedLayout: IInternalLayout = deepCopy(layout);
    saveLayout({ ...updatedLayout, hidden: undefined });
  };

  return (
    <ExpressionContent
      expression={layout.hidden ?? null}
      heading={
        <Trans
          i18nKey={'right_menu.expressions_property_preview_hidden'}
          values={{ componentName: layoutName }}
          components={{ bold: <strong /> }}
        />
      }
      onChange={(expression) => handleChangeHiddenExpressionOnLayout(expression)}
      onDelete={() => handleDeleteHiddenExpressionOnLayout()}
    />
  );
};
