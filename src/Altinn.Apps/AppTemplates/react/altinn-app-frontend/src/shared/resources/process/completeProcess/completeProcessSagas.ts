import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { put} from 'altinn-shared/utils';
import { ProcessSteps } from '../../../../types';
import { getCompleteProcessUrl } from '../../../../utils/urlHelper';
import * as ProcessStateActionTypes from '../processActionTypes';
import ProcessDispatcher from '../processDispatcher';
import { IProcess } from 'altinn-shared/types';

export function* completeProcessSaga(): SagaIterator {
  try {
    const result: IProcess = yield call(put, getCompleteProcessUrl(), null);
    if (!result) {
      throw new Error('Error: no process returned.');
    }
    if (result.ended) {
      yield call(ProcessDispatcher.completeProcessFulfilled, ProcessSteps.Archived);
    } else {
      yield call(ProcessDispatcher.completeProcessFulfilled, result.currentTask.altinnTaskType as ProcessSteps);
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
