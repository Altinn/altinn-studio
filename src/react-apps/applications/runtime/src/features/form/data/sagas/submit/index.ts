import { SagaIterator } from 'redux-saga';
import { call, takeLatest, select } from 'redux-saga/effects';
import { IRuntimeState } from '../../../../../types';
import { post } from '../../../../../utils/networking';
import FormDataActions from '../../actions';
import {
  ISumbitDataAction,
} from '../../actions/submit';
import * as FromDataActionTypes from '../../actions/types';
import { IFormDataState } from '../../reducer';

const FormDataSelector: (state: any) => IFormDataState = (state: any) => state.formData;

function* submitFormSaga({ url }: ISumbitDataAction): SagaIterator {
  const state: IRuntimeState = yield select();
  console.log(state);
  try {
    const formData: IFormDataState = yield select(FormDataSelector);
    yield call(post, url, { data: formData });
    yield call(FormDataActions.submitFormDataFulfilled);
  } catch (err) {
    yield call(FormDataActions.submitFormDataRejected, err);
  }
}

export function* watchSubmitFormSaga(): SagaIterator {
  yield takeLatest(FromDataActionTypes.SUBMIT_FORM_DATA, submitFormSaga);
}
