import { BpmnTaskType } from '../types/BpmnTaskType';
import { TaskEvent } from '../types/TaskEvent';

export type OnProcessTaskEvent = {
  taskEvent?: TaskEvent;
  taskType: BpmnTaskType;
};
