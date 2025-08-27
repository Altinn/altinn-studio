import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioToggleableTextfield } from '@studio/components-legacy';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useBpmnConfigPanelFormContext } from '../../../../contexts/BpmnConfigPanelContext';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type { MetadataForm } from 'app-shared/types/BpmnMetadataForm';
import { useValidateBpmnTaskId } from '../../../../hooks/useValidateBpmnId';

export const EditTaskId = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails, modelerRef, setBpmnDetails } = useBpmnContext();
  const { metadataFormRef } = useBpmnConfigPanelFormContext();
  const { validateBpmnTaskId } = useValidateBpmnTaskId();

  const modelerInstance = modelerRef.current;
  const modeling: Modeling = modelerInstance.get('modeling');

  const updateId = (value: string): void => {
    modeling.updateProperties(bpmnDetails.element, {
      id: value,
    });
    setBpmnDetails({
      ...bpmnDetails,
      id: value,
    });
  };

  const handleOnTaskIdBlur = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newId = event.target.value;

    if (newId === bpmnDetails.id) return;

    const newMetadata: MetadataForm = {
      taskIdChange: {
        newId,
        oldId: bpmnDetails.id,
      },
    };
    metadataFormRef.current = Object.assign({}, metadataFormRef.current, newMetadata);
    updateId(newId);
  };

  return (
    <StudioToggleableTextfield
      customValidation={validateBpmnTaskId}
      label={t('process_editor.configuration_panel_change_task_id')}
      title={t('process_editor.configuration_panel_change_task_id')}
      onBlur={handleOnTaskIdBlur}
      value={bpmnDetails.id}
    />
  );
};
