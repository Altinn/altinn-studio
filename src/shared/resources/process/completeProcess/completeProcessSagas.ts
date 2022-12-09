import { call, put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { layoutSetsSelector } from 'src/selectors/simpleSelectors';
import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';
import { IsLoadingActions } from 'src/shared/resources/isLoading/isLoadingSlice';
import { ProcessActions } from 'src/shared/resources/process/processSlice';
import { ProcessTaskType } from 'src/types';
import { behavesLikeDataTask } from 'src/utils/formLayout';
import { put as httpPut } from 'src/utils/sharedUtils';
import { getProcessNextUrl } from 'src/utils/urls/appUrlHelper';
import type { IInstanceDataState } from 'src/shared/resources/instanceData';
import type { ICompleteProcessFulfilled } from 'src/shared/resources/process';
import type { IRuntimeState } from 'src/types';
import type { IProcess } from 'src/types/shared';

const instanceDataSelector = (state: IRuntimeState) => state.instanceData;

export function* completeProcessSaga(action: PayloadAction<ICompleteProcessFulfilled | undefined>): SagaIterator {
  const taskId = action.payload?.taskId;
  try {
    const result: IProcess = yield call(httpPut, getProcessNextUrl(taskId), null);
    if (!result) {
      throw new Error('Error: no process returned.');
    }
    if (result.ended) {
      yield put(
        ProcessActions.completeFulfilled({
          processStep: ProcessTaskType.Archived,
          taskId: null,
        }),
      );
    } else {
      yield put(
        ProcessActions.completeFulfilled({
          processStep: result.currentTask?.altinnTaskType as ProcessTaskType,
          taskId: result.currentTask?.elementId,
        }),
      );
      const layoutSets = yield select(layoutSetsSelector);
      if (
        result.currentTask?.altinnTaskType === ProcessTaskType.Data ||
        behavesLikeDataTask(result.currentTask?.elementId, layoutSets)
      ) {
        yield put(IsLoadingActions.startDataTaskIsLoading());
        const instanceData: IInstanceDataState = yield select(instanceDataSelector);
        const instanceId = instanceData.instance?.id;
        yield put(InstanceDataActions.get({ instanceId }));
      }
    }
  } catch (error) {
    yield put(ProcessActions.completeRejected({ error }));
  }
}
