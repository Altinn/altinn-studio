import { SagaIterator } from 'redux-saga';
import { actionChannel, call, select, take } from 'redux-saga/effects';
import { IRuntimeState } from 'src/types';
import FormDataActions from '../formDataActions';
import * as FormDataActionTypes from '../formDataActionTypes';
import { IUpdateFormData } from './updateFormDataActions';

function* updateFormDataSaga({
  field,
  data,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  componentId,
}: IUpdateFormData): SagaIterator {
  try {
    const state: IRuntimeState = yield select();

    if (shouldUpdateFormData(state.formData.formData[field], data)) {
      yield call(FormDataActions.updateFormDataFulfilled, field, data);
    }
  } catch (err) {
    console.error(err);
    yield call(FormDataActions.updateFormDataRejected, err);
  }
}

function shouldUpdateFormData(currentData: any, newData: any): boolean {
  if (newData && newData !== '' && !currentData) {
    return true;
  }

  if (currentData !== newData) {
    return true;
  }

  return false;
}

export function* watchUpdateFormDataSaga(): SagaIterator {
  const requestChan = yield actionChannel(FormDataActionTypes.UPDATE_FORM_DATA);
  while (true) {
    const value = yield take(requestChan);
    yield call(updateFormDataSaga, value);
  }
}
