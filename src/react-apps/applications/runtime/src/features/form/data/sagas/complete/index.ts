import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';

import { post } from '../../../../../utils/networking';
import WorkflowActions from '../../../workflow/actions';
import { WorkflowSteps } from '../../../workflow/typings';
import FormActions from '../../actions';
import { ICompleteAndSendInForm } from '../../actions/complete';
import * as FormDataActionTypes from '../../actions/types';

function* completeAndSendInFormSaga({ url }: ICompleteAndSendInForm): SagaIterator {
  try {
    const response = yield call(post, url);
    if (response.data.status === 0) {
      const workflowState = response.data.nextState;
      if (workflowState === WorkflowSteps.Archived) {
        document.body.className = 'a-bgGreenLight flex-column d-flex';
      }
      yield call(FormActions.completeAndSendInFormFulfilled, response);
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
