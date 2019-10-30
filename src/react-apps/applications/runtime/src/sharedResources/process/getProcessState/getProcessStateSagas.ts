import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { get, post } from '../../../../../shared/src/utils/networking';
import * as ProcessStateActionTypes from '../processActionTypes';
import ProcessStateDispatchers from '../processDispatcher';
import * as GetProcessStateActions from './getProcessStateActions';

import {
  appPath,
} from '../../../utils/urlHelper';

export function* getProcessStateSaga({
  instanceId,
}: GetProcessStateActions.IGetProcessState): SagaIterator {
  try {
    let result = yield call(get, `${appPath}/instances/${instanceId}/process`);
    if (!!!result) {
      result = yield call(post, `${appPath}/instances/${instanceId}/process/start`);
    }
    yield call(ProcessStateDispatchers.getProcessStateFulfilled, result);
  } catch (err) {
    yield call(ProcessStateDispatchers.getProcessStateRejected, err);
  }
}

export function* watchgetProcessStateSaga(): SagaIterator {
  yield takeLatest(
    ProcessStateActionTypes.GET_PROCESS_STATE,
    getProcessStateSaga,
  );
}

// WATCHES EXPORT
export function* processStateSagas(): SagaIterator {
  yield fork(watchgetProcessStateSaga);
  // Insert all watchSagas here
}
