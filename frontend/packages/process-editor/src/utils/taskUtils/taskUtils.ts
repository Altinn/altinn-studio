import type { BpmnTaskType } from '../../types/BpmnTaskType';

export class TaskUtils {
  public static isSigningTask(taskType: BpmnTaskType): boolean {
    const signingTasks: Array<string> = ['signing', 'userControlledSigning'];
    return signingTasks.includes(taskType);
  }
}
