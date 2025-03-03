import React from 'react';
import classes from './EditPageId.module.css';
import { getPageNameErrorKey } from '../../../utils/designViewUtils';
import { useUpdateLayoutNameMutation } from '../../../hooks/mutations/useUpdateLayoutNameMutation';
import { StudioToggleableTextfield } from '@studio/components';
import { useTextIdMutation } from 'app-development/hooks/mutations';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext, useText } from '../../../hooks';
import { useFormLayoutsQuery } from '@altinn/ux-editor/hooks/queries/useFormLayoutsQuery';

export interface EditPageIdProps {
  layoutName: string;
}
export const EditPageId = ({ layoutName }: EditPageIdProps) => {
  const { app, org } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, updateLayoutsForPreview } = useAppContext();
  const { mutate: mutateTextId } = useTextIdMutation(org, app);
  const { mutate: updateLayoutName } = useUpdateLayoutNameMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );
  const { data: formLayouts } = useFormLayoutsQuery(org, app, selectedFormLayoutSetName);
  const t = useText();

  const handleSaveNewName = (newName: string) => {
    if (newName === layoutName) return;
    updateLayoutName(
      { oldName: layoutName, newName },
      {
        onSuccess: async () => {
          await updateLayoutsForPreview(selectedFormLayoutSetName);
        },
      },
    );
    mutateTextId([{ oldId: layoutName, newId: newName }]);
  };

  return (
    <div className={classes.changePageId}>
      <StudioToggleableTextfield
        customValidation={(value: string) => {
          const validationResult = getPageNameErrorKey(value, layoutName, Object.keys(formLayouts));
          return validationResult && t(validationResult);
        }}
        label={t('ux_editor.modal_properties_textResourceBindings_page_id')}
        onBlur={(event) => handleSaveNewName(event.target.value)}
        title={t('ux_editor.modal_properties_textResourceBindings_page_id')}
        value={layoutName}
      />
    </div>
  );
};
