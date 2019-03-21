import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';

import { ICheckIfConditionalRulesShouldRun } from '../../actions/conditionalRendering';
import * as FormDynamicsActionTypes from '../../actions/types';

function * checkIfConditionalRulesShouldRunSaga({
  repeatingContainerId,
}: ICheckIfConditionalRulesShouldRun): SagaIterator {
  try {
    yield call(
      console.log,
      'CheckIfConditionalRenderingRuleShouldRun',
      repeatingContainerId
    )
  } catch (err) {
    yield call(
      console.error,
      "Oh noes",
      err,
    );
  }
}

export function * watchCheckIfConditionalRulesShouldRunSaga(): SagaIterator {
  yield takeLatest(FormDynamicsActionTypes.CHECK_IF_CONDITIONAL_RULE_SHOULD_RUN, checkIfConditionalRulesShouldRunSaga);
}