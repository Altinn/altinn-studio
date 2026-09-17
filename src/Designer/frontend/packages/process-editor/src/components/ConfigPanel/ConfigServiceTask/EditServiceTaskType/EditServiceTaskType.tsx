import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioToggleableTextfield } from '@studio/components';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type { Element } from 'bpmn-js/lib/model/Types';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { StudioModeler } from '../../../../utils/bpmnModeler/StudioModeler';
import { TaskUtils } from '../../../../utils/taskUtils';

const TASK_EXTENSION_TYPE = 'altinn:TaskExtension';

export const EditServiceTaskType = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails, setBpmnDetails } = useBpmnContext();
  const taskType = bpmnDetails.taskType ?? '';
  const label = t('process_editor.configuration_panel_service_task_type_label');

  const validateTaskType = (value: string): string =>
    value.trim() ? '' : t('validation_errors.required');

  const handleOnTaskTypeBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
    const newTaskType = event.target.value.trim();
    if (newTaskType === taskType) return;

    const studioModeler = new StudioModeler(bpmnDetails.element);
    const taskExtension = TaskUtils.getTaskExtension(bpmnDetails.element);

    if (taskExtension) {
      studioModeler.updateModdleProperties({ taskType: newTaskType }, taskExtension);
    } else {
      addTaskExtension(studioModeler, bpmnDetails.element, newTaskType);
    }

    setBpmnDetails({ ...bpmnDetails, taskType: newTaskType });
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

/** A hand-authored service task can lack its task extension; other extensions are kept. */
const addTaskExtension = (
  studioModeler: StudioModeler,
  element: Element,
  taskType: string,
): void => {
  const existingValues: ModdleElement[] =
    element?.businessObject?.extensionElements?.values?.filter(Boolean) ?? [];

  studioModeler.updateElementProperties({
    extensionElements: studioModeler.createElement('bpmn:ExtensionElements', {
      values: [studioModeler.createElement(TASK_EXTENSION_TYPE, { taskType }), ...existingValues],
    }),
  });
};
