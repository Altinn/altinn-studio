import { useValidateBpmnTaskId } from '../../../../hooks/useValidateBpmnId';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import {
  StudioIconTextfield,
  StudioRecommendedNextAction,
  useStudioRecommendedNextActionContext,
} from '@studio/components';
import { KeyVerticalIcon } from '@studio/icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioModeler } from '../../../../utils/bpmnModeler/StudioModeler';

export const RecommendedActionChangeName = (): React.ReactElement => {
  const { bpmnDetails, setBpmnDetails } = useBpmnContext();
  const studioModeler = new StudioModeler(bpmnDetails.element);
  const { t } = useTranslation();
  const { validateBpmnTaskId } = useValidateBpmnTaskId();
  const { removeAction } = useStudioRecommendedNextActionContext();

  const [newName, setNewName] = useState('');
  const [newNameError, setNewNameError] = useState('');

  const saveNewName = () => {
    removeAction(bpmnDetails.element.id);
    studioModeler.updateElementProperties({ id: newName });
    setBpmnDetails({
      ...bpmnDetails,
      id: newName,
    });
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
          setNewNameError(validateBpmnTaskId(event.target.value));
        }}
        value={newName}
      />
    </StudioRecommendedNextAction>
  );
};
