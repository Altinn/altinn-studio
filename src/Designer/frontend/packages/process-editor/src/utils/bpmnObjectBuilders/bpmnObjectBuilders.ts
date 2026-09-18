import type { BpmnDetails } from '../../types/BpmnDetails';
import type { BpmnBusinessObjectEditor } from '../../types/BpmnBusinessObjectEditor';
import { TaskUtils } from '../taskUtils';

/**
 * Gets the bpmn details from the business object in editor mode
 * @param businessObject the business object in editor mode
 * @returns the bpmn details
 */
export const getBpmnEditorDetailsFromBusinessObject = (
  businessObject: BpmnBusinessObjectEditor,
): BpmnDetails => {
  return {
    id: businessObject?.id,
    name: businessObject?.name,
    taskType: TaskUtils.getTaskExtensionFromBusinessObject(businessObject)?.taskType ?? null,
    type: businessObject?.$type,
  };
};
