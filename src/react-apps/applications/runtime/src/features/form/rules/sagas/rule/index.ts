import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { ICheckIfRuleShouldRun } from '../../actions/rule';
import * as ActionTypes from '../../actions/types';

function* checkIfRuleShouldRunSaga({
  lastUpdatedComponentId,
  lastUpdatedDataBinding,
  lastUpdatedDataValue,
}: ICheckIfRuleShouldRun): SagaIterator {
  console.log('im running');
  try {
    yield call(
      console.log,
      'Check if Rule should run',
      lastUpdatedComponentId,
      lastUpdatedDataBinding,
      lastUpdatedDataValue,
    );
  } catch (err) {
    yield call(
      console.error,
      'Oh noes',
      err,
    );
  }
}

export function* watchCheckIfRuleShouldRunSaga(): SagaIterator {
  console.log('do you watch?');
  yield takeLatest(ActionTypes.CHECK_IF_RULE_SHOULD_RUN, checkIfRuleShouldRunSaga);
}
