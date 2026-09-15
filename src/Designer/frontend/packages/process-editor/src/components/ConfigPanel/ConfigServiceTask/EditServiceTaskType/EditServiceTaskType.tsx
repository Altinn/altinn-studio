import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioFieldset,
  StudioToggleableTextfield,
  StudioValidationMessage,
} from '@studio/components';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type { Element } from 'bpmn-js/lib/model/Types';
import { useResetState } from '@studio/hooks';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { StudioModeler } from '../../../../utils/bpmnModeler/StudioModeler';
import { useValidateServiceTaskType } from './useValidateServiceTaskType';
import classes from './EditServiceTaskType.module.css';

const TASK_EXTENSION_TYPE = 'altinn:TaskExtension';

export const EditServiceTaskType = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails, setBpmnDetails } = useBpmnContext();
  const { validateServiceTaskType, getServiceTaskTypeWarning } = useValidateServiceTaskType();

  const taskType = bpmnDetails.taskType ?? '';
  // The type the task already had when this panel opened, kept so the warning can tell a type the
  // developer just typed from one the task arrived with. Re-seeded when another task is selected.
  const [taskTypeWhenOpened] = useResetState(taskType, bpmnDetails.id);
  const warning = getServiceTaskTypeWarning(taskType, taskTypeWhenOpened);
  const label = t('process_editor.configuration_panel_service_task_type_label');

  const handleOnTaskTypeBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
    const newTaskType = event.target.value.trim();

    if (newTaskType === taskType) return;

    const studioModeler = new StudioModeler(bpmnDetails.element);
    const taskExtension = getTaskExtension(bpmnDetails.element);

    if (taskExtension) {
      studioModeler.updateModdleProperties({ taskType: newTaskType }, taskExtension);
    } else {
      addTaskExtension(studioModeler, bpmnDetails.element, newTaskType);
    }

    setBpmnDetails({
      ...bpmnDetails,
      taskType: newTaskType,
    });
  };

  return (
    // The warning is a direct child of the fieldset on purpose: designsystemet's `ds-field` element
    // looks for `[data-field="validation"]` directly inside the closest fieldset and adds it to the
    // input's aria-describedby. As a loose sibling it would be seen but never announced. Its
    // `data-color` keeps it out of aria-invalid, since a colliding type is legal, just unwise.
    //
    // The fieldset is that wiring anchor and nothing more — it groups one field, so naming it would
    // only make a screen reader read the same label twice.
    <StudioFieldset className={classes.fieldset}>
      <StudioToggleableTextfield
        customValidation={validateServiceTaskType}
        description={t('process_editor.configuration_panel_service_task_type_description')}
        icon={null}
        label={label}
        onBlur={handleOnTaskTypeBlur}
        title={label}
        value={taskType}
      />
      {warning && <StudioValidationMessage data-color='warning'>{warning}</StudioValidationMessage>}
    </StudioFieldset>
  );
};

const getTaskExtension = (element: Element): ModdleElement | undefined =>
  element?.businessObject?.extensionElements?.values?.find(
    (value: ModdleElement) => value?.$type === TASK_EXTENSION_TYPE,
  );

/**
 * A hand-authored service task can be missing its task extension. Setting the type is the one
 * repair that has to work without it, so create the extension on the way. Any other extension the
 * element already carries is kept, and the task extension goes first because the rest of the
 * editor reads it as `values[0]`.
 */
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
