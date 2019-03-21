import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';

import FormActions from '../../actions';
import { IFetchFormData } from '../../actions/fetch';
import * as FormDataActionTypes from '../../actions/types';

import { get } from 'Shared/utils/networking';

function * fetchFormDataSaga({url} : IFetchFormData): SagaIterator {
  try {
    const formData = yield call(get, url);
    yield call(FormActions.fetchFormDataFulfilled, formData);
  } catch (err) {
    yield call(FormActions.fetchFormDataRejected, err);
  }
}

export function* watchFormDataSaga(): SagaIterator {
  yield takeLatest(FormDataActionTypes.FETCH_FORM_DATA, fetchFormDataSaga);
}