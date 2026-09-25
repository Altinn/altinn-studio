import { type BpmnBusinessObjectEditor } from './BpmnBusinessObjectEditor';

export type SelectionChangedEvent = {
  newSelection: Array<{
    id: string;
    businessObject: BpmnBusinessObjectEditor;
  }>;
  oldSelection: Array<{
    id: string;
    businessObject: BpmnBusinessObjectEditor;
  }>;
};
