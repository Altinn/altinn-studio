import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioToggleableTextfield } from '@studio/components';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';

export const EditTaskName = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails, modelerRef } = useBpmnContext();

  const handleOnTaskNameBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
    const newName = event.target.value;

    if (newName === bpmnDetails.name) return;

    modelerRef.current
      .get<Modeling>('modeling')
      .updateProperties(bpmnDetails.element, { name: newName });
  };

  return (
    <StudioToggleableTextfield
      key={bpmnDetails.name}
      label={t('process_editor.configuration_panel_name_label')}
      title={t('process_editor.configuration_panel_name_label')}
      onBlur={handleOnTaskNameBlur}
      defaultValue={bpmnDetails.name}
      icon={null}
    />
  );
};
