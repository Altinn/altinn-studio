import type { BpmnDetails } from '../../types/BpmnDetails';
import type { BpmnBusinessObjectEditor } from '../../types/BpmnBusinessObjectEditor';

/**
 * Gets the bpmn details from the business object in editor mode
 * @param businessObject the business object in editor mode
 * @returns the bpmn details
 */
export const getBpmnEditorDetailsFromBusinessObject = (
  businessObject: BpmnBusinessObjectEditor,
): BpmnDetails => {
  const extensionElementsValues = businessObject?.extensionElements?.values;

  return {
    id: businessObject?.id,
    name: businessObject?.name,
    taskType: extensionElementsValues ? extensionElementsValues[0].taskType : null,
    type: businessObject?.$type,
  };
};
