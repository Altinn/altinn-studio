import React, { useCallback, useRef } from 'react';
import { ExpressionContent } from '../../config/ExpressionContent';
import type { Expression } from '@studio/components';
import type { IInternalLayout } from '../../../types/global';
import { ObjectUtils } from '@studio/pure-functions';
import { useFormLayoutMutation } from '../../../hooks/mutations/useFormLayoutMutation';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useSelectedFormLayoutWithName, useAppContext } from '../../../hooks';
import { Trans } from 'react-i18next';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';

export const HiddenExpressionOnLayout = () => {
  const { app, org } = useStudioUrlParams();
  const { layout, layoutName } = useSelectedFormLayoutWithName();
  const { selectedFormLayoutSetName } = useAppContext();
  const { mutate: saveLayout } = useFormLayoutMutation(
    org,
    app,
    layoutName,
    selectedFormLayoutSetName,
  );
  const autoSaveTimeoutRef = useRef(undefined);

  const handleDeleteHiddenExpressionOnLayout = async () => {
    const updatedLayout: IInternalLayout = ObjectUtils.deepCopy(layout);
    saveLayout({ ...updatedLayout, hidden: undefined });
  };

  const handleChangeHiddenExpressionOnLayout = useCallback(
    async (expression: Expression): Promise<void> => {
      const updatedLayout: IInternalLayout = ObjectUtils.deepCopy(layout);
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveLayout({ ...updatedLayout, hidden: expression });
      }, AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS);
    },
    [layout, saveLayout],
  );

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
