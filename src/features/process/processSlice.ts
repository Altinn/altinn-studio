import type { PayloadAction } from '@reduxjs/toolkit';
import type { WritableDraft } from 'immer/dist/types/types-external';

import { checkProcessUpdated } from 'src/features/process/checkProcessUpdatedSagas';
import { completeProcessSaga } from 'src/features/process/completeProcessSagas';
import { getProcessStateSaga } from 'src/features/process/getProcessStateSagas';
import { getTasksSaga } from 'src/features/process/getTasksSagas';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type {
  ICompleteProcess,
  ICompleteProcessFulfilled,
  ICompleteProcessRejected,
  IGetProcessStateFulfilled,
  IGetProcessStateRejected,
  IGetTasksFulfilled,
  IProcessState,
} from 'src/features/process/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: IProcessState = {
  taskType: null,
  error: null,
  taskId: undefined,
  read: null,
  write: null,
  actions: null,
};

const genericFulfilledReducer = (
  state: WritableDraft<IProcessState>,
  action: PayloadAction<IGetProcessStateFulfilled>,
) => {
  const { taskType, taskId, read, write, actions } = action.payload;
  state.taskType = taskType;
  state.taskId = taskId;
  state.read = read;
  state.write = write;
  state.actions = actions;
  state.error = null;
};

export let ProcessActions: ActionsFromSlice<typeof processSlice>;
export const processSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IProcessState>) => ({
    name: 'process',
    initialState,
    actions: {
      getTasks: mkAction<IGetTasksFulfilled>({
        takeLatest: getTasksSaga,
      }),
      getTasksFulfilled: mkAction<IGetTasksFulfilled>({
        reducer: (state: WritableDraft<IProcessState>, action: PayloadAction<IGetTasksFulfilled>) => {
          state.availableNextTasks = action.payload.tasks;
          state.error = null;
        },
      }),
      getTasksRejected: mkAction<IGetProcessStateRejected>({
        reducer: (state, action) => {
          state.error = action.payload.error;
        },
      }),
      get: mkAction<void>({
        takeLatest: getProcessStateSaga,
      }),
      getFulfilled: mkAction<IGetProcessStateFulfilled>({
        takeLatest: getTasksSaga,
        reducer: genericFulfilledReducer,
      }),
      getRejected: mkAction<IGetProcessStateRejected>({
        reducer: (state, action) => {
          state.error = action.payload.error;
        },
      }),
      complete: mkAction<ICompleteProcess | undefined>({
        takeLatest: completeProcessSaga,
      }),
      completeFulfilled: mkAction<ICompleteProcessFulfilled>({
        takeLatest: getTasksSaga,
        reducer: genericFulfilledReducer,
      }),
      completeRejected: mkAction<ICompleteProcessRejected>({
        reducer: (state, action) => {
          state.error = action.payload.error;
        },
      }),
      checkIfUpdated: mkAction<void>({
        takeLatest: checkProcessUpdated,
      }),
    },
  }));

  ProcessActions = slice.actions;
  return slice;
};
