import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';

import { post } from '../../../../../utils/networking';
import WorkflowActions from '../../../workflow/actions';
import FormActions from '../../actions';
import { ICompleteAndSendInForm } from '../../actions/complete';
import * as FormDataActionTypes from '../../actions/types';

function* completeAndSendInFormSaga({ url }: ICompleteAndSendInForm): SagaIterator {
  try {
    const response = yield call(post, url);
    if (response.data.status === 0) {
      yield call(FormActions.completeAndSendInFormFulfilled);
      yield call(WorkflowActions.setCurrentState, response.data.nextState);
    } else {
      yield call(FormActions.completeAndSendInFormRejected, {});
    }
  } catch (err) {
    yield call(FormActions.completeAndSendInFormRejected, err);
  }
}

export function* watchCompleteAndSendInFormSaga(): SagaIterator {
  yield takeLatest(FormDataActionTypes.COMPLETE_AND_SEND_IN_FORM, completeAndSendInFormSaga);
}
