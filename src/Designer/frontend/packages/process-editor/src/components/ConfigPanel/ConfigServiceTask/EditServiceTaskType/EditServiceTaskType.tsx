import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioToggleableTextfield } from '@studio/components';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type { Moddle } from 'bpmn-js/lib/model/Types';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { TaskUtils } from '../../../../utils/taskUtils';

const TASK_EXTENSION_TYPE = 'altinn:TaskExtension';

export const EditServiceTaskType = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails, modelerRef } = useBpmnContext();
  const taskType = bpmnDetails.taskType ?? '';
  const label = t('process_editor.configuration_panel_service_task_type_label');

  const validateTaskType = (value: string): string =>
    value.trim() ? '' : t('validation_errors.required');

  const handleOnTaskTypeBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
    const newTaskType = event.target.value.trim();
    if (newTaskType === taskType) return;

    const modeling = modelerRef.current.get<Modeling>('modeling');
    const moddle = modelerRef.current.get<Moddle>('moddle');
    const taskExtension = TaskUtils.getTaskExtension(bpmnDetails.element);

    if (taskExtension) {
      modeling.updateModdleProperties(bpmnDetails.element, taskExtension, {
        taskType: newTaskType,
      });
    } else {
      const existingValues: ModdleElement[] =
        bpmnDetails.element.businessObject.extensionElements?.values ?? [];
      modeling.updateProperties(bpmnDetails.element, {
        extensionElements: moddle.create('bpmn:ExtensionElements', {
          values: [
            moddle.create(TASK_EXTENSION_TYPE, { taskType: newTaskType }),
            ...existingValues,
          ],
        }),
      });
    }
  };

  return (
    <StudioToggleableTextfield
      key={taskType}
      customValidation={validateTaskType}
      description={t('process_editor.configuration_panel_service_task_type_description')}
      icon={null}
      label={label}
      onBlur={handleOnTaskTypeBlur}
      title={label}
      value={taskType}
    />
  );
};
