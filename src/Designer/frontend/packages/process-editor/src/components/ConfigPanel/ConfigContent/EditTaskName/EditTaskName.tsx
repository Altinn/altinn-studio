import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioToggleableTextfield } from '@studio/components';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { StudioModeler } from '../../../../utils/bpmnModeler/StudioModeler';

export const EditTaskName = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails, setBpmnDetails } = useBpmnContext();

  // A bpmn name is free text and optional, matching what the canvas allows when the shape label is
  // edited directly, so there is nothing to validate here.
  const handleOnTaskNameBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
    const newName = event.target.value;

    if (newName === bpmnDetails.name) return;

    const studioModeler = new StudioModeler(bpmnDetails.element);
    studioModeler.updateElementProperties({ name: newName });

    setBpmnDetails({
      ...bpmnDetails,
      name: newName,
    });
  };

  return (
    <StudioToggleableTextfield
      label={t('process_editor.configuration_panel_name_label')}
      title={t('process_editor.configuration_panel_name_label')}
      onBlur={handleOnTaskNameBlur}
      defaultValue={bpmnDetails.name}
      icon={null}
    />
  );
};
