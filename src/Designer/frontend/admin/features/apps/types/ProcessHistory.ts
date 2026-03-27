type ProcessEventType =
  | 'process_StartEvent'
  | 'process_EndEvent'
  | 'process_StartTask'
  | 'process_EndTask'
  | 'process_AbandonTask';

export type ProcessHistoryItem = {
  eventType: ProcessEventType;
  elementId: string;
  occured: string;
  started: string | null;
  ended: string | null;
  performedBy: string;
};
