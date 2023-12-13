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
  const bpmnType = businessObject?.$type;
  const bpmnId = businessObject?.id;
  const bpmnName = businessObject?.name;

  const extensionElements = businessObject?.extensionElements;
  const values = extensionElements?.values;
  const $children = values ? values[0].$children : null;
  const $body = $children ? $children[0].$body : null;

  const bpmnDetails: BpmnDetails = {
    id: bpmnId,
    name: bpmnName,
    taskType: $body,
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
  const taskType = values ? values[0].taskType : null;

  const bpmnDetails: BpmnDetails = {
    id: bpmnId,
    name: bpmnName,
    taskType,
    type: bpmnType,
  };
  return bpmnDetails;
};
