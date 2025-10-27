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

export const RecommendedActionChangeName = (): React.ReactElement => {
  const { bpmnDetails } = useBpmnContext();
  const { layoutSets, mutateLayoutSetId } = useBpmnApiContext();
  const { validateLayoutSetName } = useValidateLayoutSetName();
  const { t } = useTranslation();
  const { removeAction } = useStudioRecommendedNextActionContext();

  const [newName, setNewName] = useState('');
  const [newNameError, setNewNameError] = useState('');

  const saveNewName = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newNameError || newName === '') {
      return false;
    }
    mutateLayoutSetId({ layoutSetIdToUpdate: bpmnDetails.element.id, newLayoutSetId: newName });
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
      hideSaveButton={Boolean(newNameError) || newName === ''}
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
