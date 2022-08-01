import { call, put as sagaPut, select } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';
import { IsLoadingActions } from 'src/shared/resources/isLoading/isLoadingSlice';
import { ProcessActions } from 'src/shared/resources/process/processSlice';
import { ProcessTaskType } from 'src/types';
import { getCompleteProcessUrl } from 'src/utils/appUrlHelper';
import type { IInstanceDataState } from 'src/shared/resources/instanceData';
import type { IRuntimeState } from 'src/types';

import { put } from 'altinn-shared/utils';
import type { IProcess } from 'altinn-shared/types';

const instanceDataSelector = (state: IRuntimeState) => state.instanceData;

export function* completeProcessSaga(): SagaIterator {
  try {
    const result: IProcess = yield call(put, getCompleteProcessUrl(), null);
    if (!result) {
      throw new Error('Error: no process returned.');
    }
    if (result.ended) {
      yield sagaPut(
        ProcessActions.completeFulfilled({
          processStep: ProcessTaskType.Archived,
          taskId: null,
        }),
      );
    } else {
      yield sagaPut(
        ProcessActions.completeFulfilled({
          processStep: result.currentTask.altinnTaskType as ProcessTaskType,
          taskId: result.currentTask.elementId,
        }),
      );
      if (
        (result.currentTask.altinnTaskType as ProcessTaskType) ===
        ProcessTaskType.Data
      ) {
        yield sagaPut(IsLoadingActions.startDataTaskIsLoading());
        const instanceData: IInstanceDataState = yield select(
          instanceDataSelector,
        );
        const instanceId = instanceData.instance.id;
        yield sagaPut(InstanceDataActions.get({ instanceId }));
      }
    }
  } catch (error) {
    yield sagaPut(ProcessActions.completeRejected({ error }));
  }
}
