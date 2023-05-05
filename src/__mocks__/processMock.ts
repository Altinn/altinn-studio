import { ProcessTaskType } from 'src/types';
import type { IProcessActions, IProcessState } from 'src/features/process';

export function getProcessStateMock(
  processState: Omit<Partial<IProcessState>, 'actions'> & { actions?: Partial<IProcessActions> } = {},
): IProcessState {
  return {
    taskType: ProcessTaskType.Data,
    taskId: 'Task_1',
    read: true,
    write: true,
    error: null,
    completingId: null,
    ...processState,
    actions: {
      instantiate: true,
      confirm: true,
      sign: true,
      reject: true,
      ...processState.actions,
    },
  };
}
