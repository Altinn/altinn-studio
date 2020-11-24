import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFormDataSaga, watchFetchFormDataInitialSaga } from './fetch/fetchFormDataSagas';
import { watchAutoSaveSaga, watchSaveFormDataSaga, watchSubmitFormSaga } from './submit/submitFormDataSagas';
import { watchUpdateFormDataSaga } from './update/updateFormDataSagas';

export default function* formDataSagas(): SagaIterator {
  yield fork(watchFormDataSaga);
  yield fork(watchSaveFormDataSaga);
  yield fork(watchSubmitFormSaga);
  yield fork(watchUpdateFormDataSaga);
  yield fork(watchFetchFormDataInitialSaga);
  yield fork(watchAutoSaveSaga);
}
