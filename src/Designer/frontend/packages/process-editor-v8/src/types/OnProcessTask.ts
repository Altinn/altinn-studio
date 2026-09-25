import type { BpmnTaskType } from '../types/BpmnTaskType';
import type { TaskEvent } from '../types/TaskEvent';

export type OnProcessTaskEvent = {
  taskEvent?: TaskEvent;
  taskType: BpmnTaskType;
};
