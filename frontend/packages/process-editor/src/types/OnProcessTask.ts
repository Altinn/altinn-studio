import type { TaskEvent } from '@altinn/process-editor/utils/ProcessTaskManager';

export type OnProcessTaskEvent = {
  taskEvent?: TaskEvent;
  taskType: string;
};
