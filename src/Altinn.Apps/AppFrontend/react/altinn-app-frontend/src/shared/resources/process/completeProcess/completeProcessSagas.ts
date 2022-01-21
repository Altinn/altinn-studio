import { SagaIterator } from 'redux-saga';
import { call, fork, put as sagaPut, select, takeLatest } from 'redux-saga/effects';
import { put } from 'altinn-shared/utils';
import { IProcess } from 'altinn-shared/types';
import { IRuntimeState, ProcessTaskType } from '../../../../types';
import { getCompleteProcessUrl } from '../../../../utils/urlHelper2';
import * as ProcessStateActionTypes from '../processActionTypes';
import ProcessDispatcher from '../processDispatcher';
import InstanceDataActions from '../../instanceData/instanceDataActions';
import { IInstanceDataState } from '../../instanceData/instanceDataReducers';
import { startDataTaskIsLoading } from '../../isLoading/isLoadingSlice';

const instanceDataSelector = (state: IRuntimeState) => state.instanceData;

export function* completeProcessSaga(): SagaIterator {
  try {
    const result: IProcess = yield call(put, getCompleteProcessUrl(), null);
    if (!result) {
      throw new Error('Error: no process returned.');
    }
    if (result.ended) {
      yield call(ProcessDispatcher.completeProcessFulfilled, ProcessTaskType.Archived, null);
    } else {
      yield call(ProcessDispatcher.completeProcessFulfilled,
        result.currentTask.altinnTaskType as ProcessTaskType,
        result.currentTask.elementId);
      if ((result.currentTask.altinnTaskType as ProcessTaskType) === ProcessTaskType.Data) {
        yield sagaPut(startDataTaskIsLoading());
        const instanceData: IInstanceDataState = yield select(instanceDataSelector);
        const [instanceOwner, instanceId] = instanceData.instance.id.split('/');
        yield call(
          InstanceDataActions.getInstanceData,
          instanceOwner,
          instanceId,
        );
      }
    }
  } catch (err) {
    yield call(ProcessDispatcher.completeProcessRejected, err);
  }
}

export function* watchCompleteProcessSaga(): SagaIterator {
  yield takeLatest(
    ProcessStateActionTypes.COMPLETE_PROCESS,
    completeProcessSaga,
  );
}

// WATCHES EXPORT
export function* processStateSagas(): SagaIterator {
  yield fork(watchCompleteProcessSaga);
  // Insert all watchSagas here
}
