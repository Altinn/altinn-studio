import type { BpmnTaskType } from './BpmnTaskType';
import type { TaskEvent } from './TaskEvent';

export type OnProcessTaskEvent = {
  taskEvent?: TaskEvent;
  taskType: BpmnTaskType;
};
