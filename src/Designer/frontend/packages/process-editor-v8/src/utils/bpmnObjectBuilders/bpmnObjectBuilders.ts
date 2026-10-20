import type { BpmnDetails } from '../../types/BpmnDetails';
import type { BpmnBusinessObjectViewer } from '../../types/BpmnBusinessObjectViewer';
import type { BpmnBusinessObjectEditor } from '../../types/BpmnBusinessObjectEditor';

/**
 * Gets the bpmn details from the business object in viewer mode
 * @param businessObject the business object in viewer mode
 * @returns the bpmn details
 */
export const getBpmnViewerDetailsFromBusinessObject = (
  businessObject: BpmnBusinessObjectViewer,
): BpmnDetails => {
  const bpmnAttrs = businessObject?.$attrs;
  const bpmnTaskType = bpmnAttrs ? bpmnAttrs['altinn:tasktype'] : null;

  return {
    id: businessObject?.id,
    name: businessObject?.name,
    taskType: bpmnTaskType,
    type: businessObject?.$type,
  };
};

/**
 * Gets the bpmn details from the business object in editor mode
 * @param businessObject the business object in editor mode
 * @returns the bpmn details
 */
export const getBpmnEditorDetailsFromBusinessObject = (
  businessObject: BpmnBusinessObjectEditor,
): BpmnDetails => {
  const extensionElementsValues = businessObject?.extensionElements?.values;
  const taskTypeFromV8 = extensionElementsValues ? extensionElementsValues[0].taskType : null;

  const bpmnAttrs = businessObject.$attrs;
  const taskTypeFromV7 = bpmnAttrs ? bpmnAttrs['altinn:tasktype'] : null;

  return {
    id: businessObject?.id,
    name: businessObject?.name,
    taskType: taskTypeFromV8 || taskTypeFromV7,
    type: businessObject?.$type,
  };
};
