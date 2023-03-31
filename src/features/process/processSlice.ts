import type { PayloadAction } from '@reduxjs/toolkit';
import type { WritableDraft } from 'immer/dist/types/types-external';

import { checkProcessUpdated } from 'src/features/process/checkProcessUpdatedSagas';
import { completeProcessSaga } from 'src/features/process/completeProcessSagas';
import { getProcessStateSaga } from 'src/features/process/getProcessStateSagas';
import { getTasksSaga } from 'src/features/process/getTasksSagas';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type {
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
};

const genericFulfilledReducer = (
  state: WritableDraft<IProcessState>,
  action: PayloadAction<IGetProcessStateFulfilled>,
) => {
  state.taskType = action.payload.processStep;
  state.taskId = action.payload.taskId;
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
      complete: mkAction<ICompleteProcessFulfilled | undefined>({
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
