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
  console.log('businessobject', businessObject);
  const bpmnType = businessObject?.$type;
  const bpmnId = businessObject?.id;
  const bpmnName = businessObject?.name;
  const bpmnAttrs = businessObject?.$attrs;
  const bpmnTasktype = bpmnAttrs ? bpmnAttrs['altinn:tasktype'] : null;

  const bpmnDetails: BpmnDetails = {
    id: bpmnId,
    name: bpmnName,
    taskType: bpmnTasktype,
    type: bpmnType,
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
  const bpmnType = businessObject?.$type;
  const bpmnId = businessObject?.id;
  const bpmnName = businessObject?.name;

  const extensionElements = businessObject?.extensionElements;
  const values = extensionElements?.values;
  const taskTypeFromV8 = values ? values[0].taskType : null;

  const bpmnAttrs = businessObject.$attrs;
  const taskTypeFromV7 = bpmnAttrs ? bpmnAttrs['altinn:tasktype'] : null;

  const bpmnDetails: BpmnDetails = {
    id: bpmnId,
    name: bpmnName,
    taskType: taskTypeFromV8 || taskTypeFromV7,
    type: bpmnType,
  };
  return bpmnDetails;
};
