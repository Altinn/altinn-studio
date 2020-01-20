import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { get } from 'app-shared/utils/networking';
import * as ConfigurationActionTypes from '../configurationActionTypes';
import ConfigurationDispatcher from '../configurationDispatcher';

import { getEnvironmentsConfigUrl } from './../../../utils/urlHelper';

// GET ENVIRONMENTS
function* getEnvironmentsSaga(): SagaIterator {
  try {
    const result = yield call(get, getEnvironmentsConfigUrl());
    yield call(ConfigurationDispatcher.getEnvironmentsFulfilled, result);
  } catch (err) {
    yield call(ConfigurationDispatcher.getEnvironmentsRejected, err);
  }
}

function* watchGetEnvironmentsSaga(): SagaIterator {
  yield takeLatest(
    ConfigurationActionTypes.GET_ENVIRONMENTS,
    getEnvironmentsSaga,
  );
}

// WATCHES EXPORT
export default function* getEnvironmentsSagas(): SagaIterator {
  yield fork(watchGetEnvironmentsSaga);
  // Insert all watchSagas here
}
