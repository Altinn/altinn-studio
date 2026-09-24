import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioToggleableTextfield } from '@studio/components';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';
import { useUpdateLayoutSetId } from '../../../../hooks/useUpdateLayoutSetId';

interface EditLayoutSetNameProps {
  existingLayoutSetName: string;
}
export const EditLayoutSetName = ({
  existingLayoutSetName,
}: EditLayoutSetNameProps): React.ReactElement => {
  const { t } = useTranslation();
  const { layoutSets } = useBpmnApiContext();
  const updateLayoutSetId = useUpdateLayoutSetId();
  const { validateLayoutSetName } = useValidateLayoutSetName();

  const handleOnLayoutSetNameBlur = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newName = event.target.value;
    if (newName === existingLayoutSetName) return;
    updateLayoutSetId(existingLayoutSetName, newName);
  };

  return (
    <StudioToggleableTextfield
      customValidation={(newLayoutSetName: string) =>
        validateLayoutSetName(newLayoutSetName, layoutSets, existingLayoutSetName)
      }
      label={t('process_editor.configuration_panel_layout_set_name_label')}
      onBlur={handleOnLayoutSetNameBlur}
      title={t('process_editor.configuration_panel_layout_set_name_label')}
      value={existingLayoutSetName}
    />
  );
};
