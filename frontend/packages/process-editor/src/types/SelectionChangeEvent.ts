import { type BpmnBusinessObjectEditor } from './BpmnBusinessObjectEditor';

export type SelectionChangedEvent = {
  newSelection: Array<{
    element: {
      id: string;
      businessObject: BpmnBusinessObjectEditor;
    };
  }>;
  oldSelection: Array<{
    element: {
      id: string;
      businessObject: BpmnBusinessObjectEditor;
    };
  }>;
};
