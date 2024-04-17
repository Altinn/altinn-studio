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
  const bpmnTasktype = bpmnAttrs ? bpmnAttrs['altinn:tasktype'] : null;

  const bpmnDetails: BpmnDetails = {
    id: businessObject?.id,
    name: businessObject?.name,
    taskType: bpmnTasktype,
    type: businessObject?.$type,
  };
  return bpmnDetails;
};

/**
 * Gets the bpmn details from the business object in editor mode
 * @param businessObject the business object in editor mode
 * @returns the bpmn details
 */
export const getBpmnEditorDetailsFromBusinessObject = (
  businessObject: BpmnBusinessObjectEditor,
): BpmnDetails => {
  const bpmnDetails: BpmnDetails = {
    id: businessObject?.id,
    name: businessObject?.name,
    taskType: getTaskType(businessObject),
    type: businessObject?.$type,
  };
  return bpmnDetails;
};

const getTaskType = (businessObject: BpmnBusinessObjectEditor) => {
  const extensionElementsValues = businessObject?.extensionElements?.values;
  const bpmnAttrs = businessObject.$attrs;
  const taskTypeFromV8 = extensionElementsValues ? extensionElementsValues[0].taskType : null;
  const taskTypeFromV7 = bpmnAttrs ? bpmnAttrs['altinn:tasktype'] : null;
  const taskTypeEnd = businessObject?.$type === 'bpmn:EndEvent' ? 'endEvent' : null;

  if (taskTypeFromV8) return taskTypeFromV8;
  if (taskTypeFromV7) return taskTypeFromV7;
  if (taskTypeEnd) return taskTypeEnd;
  return null;
};
