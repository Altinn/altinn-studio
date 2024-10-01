import React from 'react';
import { ExpressionContent } from '../../config/ExpressionContent';
import type { Expression } from '@studio/components';
import type { IInternalLayout } from '../../../types/global';
import { ObjectUtils } from '@studio/pure-functions';
import { useFormLayoutMutation } from '../../../hooks/mutations/useFormLayoutMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useSelectedFormLayoutWithName, useAppContext } from '../../../hooks';
import { Trans } from 'react-i18next';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import { useDebounce } from '@studio/hooks';
import classes from './HiddenExpressionOnLayout.module.css';

export const HiddenExpressionOnLayout = () => {
  const { app, org } = useStudioEnvironmentParams();
  const { layout, layoutName } = useSelectedFormLayoutWithName();
  const { selectedFormLayoutSetName, refetchAppLayouts } = useAppContext();
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
        { internalLayout: { ...updatedLayout, hidden: expression } },
        {
          onSuccess: async () => {
            await refetchAppLayouts(selectedFormLayoutSetName);
          },
        },
      ),
    );
  };

  const handleDeleteHiddenExpressionOnLayout = async () => {
    const updatedLayout: IInternalLayout = ObjectUtils.deepCopy(layout);
    saveLayout({ internalLayout: { ...updatedLayout, hidden: undefined } });
  };

  return (
    <ExpressionContent
      expression={layout.hidden ?? null}
      heading={
        <Trans
          i18nKey={'right_menu.expressions_property_preview_hidden'}
          values={{ componentName: layoutName }}
          components={{
            componentName: <span className={classes.componentName} />,
            textElement: <span className={classes.textElement} />,
          }}
        />
      }
      onChange={(expression) => handleChangeHiddenExpressionOnLayout(expression)}
      onDelete={() => handleDeleteHiddenExpressionOnLayout()}
    />
  );
};
