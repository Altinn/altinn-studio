export type BpmnTaskType = 'data' | 'confirmation' | 'feedback' | 'signing';

export interface BpmnDetails {
  id: string;
  name: string;
  type: BpmnTaskType;
}
