import React from 'react';
import { ExpressionContent } from '../../config/ExpressionContent';
import type { Expression } from '@studio/components';
import type { IInternalLayout } from '../../../types/global';
import { ObjectUtils } from '@studio/pure-functions';
import { useFormLayoutMutation } from '../../../hooks/mutations/useFormLayoutMutation';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useSelectedFormLayoutWithName, useAppContext } from '../../../hooks';
import { Trans } from 'react-i18next';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import { useDebounce } from 'app-shared/hooks/useDebounce';

export const HiddenExpressionOnLayout = () => {
  const { app, org } = useStudioUrlParams();
  const { layout, layoutName } = useSelectedFormLayoutWithName();
  const { selectedFormLayoutSetName, refetchLayouts } = useAppContext();
  const { mutate: saveLayout } = useFormLayoutMutation(
    org,
    app,
    layoutName,
    selectedFormLayoutSetName,
  );
  const { debounce } = useDebounce({ debounceTimeInMs: AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS });

  const handleChangeHiddenExpressionOnLayout = (expression: Expression) => {
    const updatedLayout: IInternalLayout = ObjectUtils.deepCopy(layout);
    debounce(() =>
      saveLayout(
        { ...updatedLayout, hidden: expression },
        {
          onSuccess: async () => {
            await refetchLayouts(selectedFormLayoutSetName);
          },
        },
      ),
    );
  };

  const handleDeleteHiddenExpressionOnLayout = async () => {
    const updatedLayout: IInternalLayout = ObjectUtils.deepCopy(layout);
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
