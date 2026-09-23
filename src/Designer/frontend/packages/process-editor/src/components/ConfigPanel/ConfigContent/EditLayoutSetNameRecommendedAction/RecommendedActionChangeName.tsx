import { useBpmnContext } from '../../../../contexts/BpmnContext';
import {
  StudioIconTextfield,
  StudioRecommendedNextAction,
  useStudioRecommendedNextActionContext,
} from '@studio/components';
import { KeyVerticalIcon } from '@studio/icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBpmnApiContext } from '@altinn/process-editor/contexts/BpmnApiContext';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';
import { useUpdateLayoutSetId } from '../../../../hooks/useUpdateLayoutSetId';

export const RecommendedActionChangeName = (): React.ReactElement => {
  const { bpmnDetails } = useBpmnContext();
  const { layoutSets, pendingApiOperations } = useBpmnApiContext();
  const updateLayoutSetId = useUpdateLayoutSetId();
  const { validateLayoutSetName } = useValidateLayoutSetName();
  const { t } = useTranslation();
  const { removeAction } = useStudioRecommendedNextActionContext();

  const [newName, setNewName] = useState('');
  const [newNameError, setNewNameError] = useState('');

  const saveNewName = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Renaming before the new task is saved would rename a layout set whose task the saved process does not have yet.
    if (newNameError || newName === '' || pendingApiOperations) {
      return false;
    }
    updateLayoutSetId(bpmnDetails.element.id, newName);
    removeAction(bpmnDetails.element.id);
  };

  const cancelAction = () => {
    removeAction(bpmnDetails.element.id);
  };

  return (
    <StudioRecommendedNextAction
      title={t('process_editor.recommended_action.new_name')}
      description={t('process_editor.recommended_action.new_name_description')}
      saveButtonText={t('general.save')}
      skipButtonText={t('general.skip')}
      hideSaveButton={Boolean(newNameError) || newName === '' || pendingApiOperations}
      onSave={saveNewName}
      onSkip={cancelAction}
    >
      <StudioIconTextfield
        error={newNameError}
        icon={<KeyVerticalIcon />}
        label={t('process_editor.recommended_action.new_name_label')}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setNewName(event.target.value);
          setNewNameError(validateLayoutSetName(event.target.value, layoutSets));
        }}
        value={newName}
      />
    </StudioRecommendedNextAction>
  );
};
