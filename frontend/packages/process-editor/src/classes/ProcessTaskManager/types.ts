import { BpmnBusinessObjectEditor } from '@altinn/process-editor/types/BpmnBusinessObjectEditor';

export type TaskEvent = Event & {
  element: {
    businessObject: BpmnBusinessObjectEditor;
  };
};
