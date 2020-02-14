import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';

import { ICheckIfApiShouldFetchAction } from './apiActions';
import * as FormDynamicsActionTypes from '../formDynamicsActionTypes';

function * checkIfApiShouldFetchSaga({
  updatedComponentId,
  updatedDataField,
  updatedData,
  repeating,
  dataModelGroup,
  index,
}: ICheckIfApiShouldFetchAction): SagaIterator {
  try {
    // Todo: implement checks if the api should fetch
    yield call(console.log,
      'Check if API should fetch',
      updatedComponentId,
      updatedDataField,
      updatedData,
      repeating,
      dataModelGroup,
      index,
    );
  } catch (err) {
    yield call(
      console.error,
      'Oh noes',
      err,
    );
  }
}

export function * watchCheckIfApiShouldFetchSaga(): SagaIterator {
  yield takeLatest(FormDynamicsActionTypes.CHECK_IF_API_ACTIONS_SHOULD_RUN, checkIfApiShouldFetchSaga);
}
