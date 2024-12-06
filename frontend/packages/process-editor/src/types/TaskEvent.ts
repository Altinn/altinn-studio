import { type BpmnBusinessObjectEditor } from './BpmnBusinessObjectEditor';

export type TaskEvent = Event & {
  element: {
    id: string;
    businessObject: BpmnBusinessObjectEditor;
  };
};
