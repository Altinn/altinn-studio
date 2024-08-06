import { useValidateBpmnTaskId } from '../../../../hooks/useValidateBpmnId';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { StudioIconTextfield, StudioRecommendedNextAction } from '@studio/components';
import { KeyVerticalIcon } from '@studio/icons';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface NewNameRecommendationProps {}

export const NewNameRecommendation = ({}: NewNameRecommendationProps): React.ReactElement => {
  const { bpmnDetails, setBpmnDetails, modelerRef } = useBpmnContext();
  const modelerInstance = modelerRef.current;
  const modeling: Modeling = modelerInstance.get('modeling');
  const { t } = useTranslation();
  const { validateBpmnTaskId } = useValidateBpmnTaskId();

  const [newName, setNewName] = useState('');
  const [newNameError, setNewNameError] = useState('');

  const saveNewName = () => {
    modeling.updateProperties(bpmnDetails.element, {
      id: newName,
    });
    setBpmnDetails({
      ...bpmnDetails,
      id: newName,

      metadata: {
        ...bpmnDetails.metadata,
        justAdded: false,
      },
    });
  };

  const cancelAction = () => {
    setBpmnDetails({
      ...bpmnDetails,

      metadata: {
        ...bpmnDetails.metadata,
        justAdded: false,
      },
    });
  };

  return (
    <StudioRecommendedNextAction
      title={t('process_editor.recommended_action.new_name')}
      description={t('process_editor.recommended_action.new_name_description')}
      saveButtonText={t('general.save')}
      skipButtonText={t('general.skip')}
      hideSaveButton={!!newNameError || newName == ''}
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
