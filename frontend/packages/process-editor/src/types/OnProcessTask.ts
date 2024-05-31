import type { TaskEvent } from '@altinn/process-editor/utils/ProcessTaskManager';
import { BpmnTaskType } from '@altinn/process-editor/types/BpmnTaskType';

export type OnProcessTaskEvent = {
  taskEvent?: TaskEvent;
  taskType: BpmnTaskType;
};
