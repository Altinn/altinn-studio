import { type BpmnBusinessObjectEditor } from '../../types/BpmnBusinessObjectEditor';

export type TaskEvent = Event & {
  element: {
    businessObject: BpmnBusinessObjectEditor;
  };
};
