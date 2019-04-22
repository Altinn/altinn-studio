import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';

import FormDataActions from '../../actions';
import * as FormDataActionTypes from '../../actions/types';
import { IUpdateFormData } from '../../actions/update';

function* updateFormDataSaga({ data, field }: IUpdateFormData): SagaIterator {
  try {
    yield call(FormDataActions.updateFormDataFulfilled, field, data);
  } catch (err) {
    yield call(FormDataActions.updateFormDataRejected, err);
  }
}

export function* watchUpdateFormDataSaga(): SagaIterator {
  yield takeLatest(FormDataActionTypes.UPDATE_FORM_DATA, updateFormDataSaga);
}
