import { type BpmnBusinessObjectEditor } from '../../types/BpmnBusinessObjectEditor';

export type TaskEvent = Event & {
  element: {
    id: string;
    businessObject: BpmnBusinessObjectEditor;
  };
};
