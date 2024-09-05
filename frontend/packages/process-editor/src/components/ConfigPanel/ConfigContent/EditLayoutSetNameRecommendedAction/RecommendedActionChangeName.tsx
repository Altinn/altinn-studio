import { useBpmnContext } from '../../../../contexts/BpmnContext';
import {
  StudioIconTextfield,
  StudioRecommendedNextAction,
  useStudioRecommendedNextActionContext,
} from '@studio/components';
import { KeyVerticalIcon } from '@studio/icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLayoutSetIdValidationErrorKey } from 'app-shared/utils/layoutSetsUtils';
import { useBpmnApiContext } from '@altinn/process-editor/contexts/BpmnApiContext';

export const RecommendedActionChangeName = (): React.ReactElement => {
  const { bpmnDetails } = useBpmnContext();
  const { layoutSets, mutateLayoutSetId } = useBpmnApiContext();
  const { t } = useTranslation();
  const { removeAction } = useStudioRecommendedNextActionContext();

  const [newName, setNewName] = useState('');
  const [newNameError, setNewNameError] = useState('');

  const handleValidation = (newLayoutSetId: string): string => {
    const validationResult = getLayoutSetIdValidationErrorKey(
      layoutSets,
      bpmnDetails.element.id,
      newLayoutSetId,
    );
    return validationResult ? t(validationResult) : undefined;
  };

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
        size='sm'
        label={t('process_editor.recommended_action.new_name_label')}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setNewName(event.target.value);
          setNewNameError(handleValidation(event.target.value));
        }}
        value={newName}
      />
    </StudioRecommendedNextAction>
  );
};
