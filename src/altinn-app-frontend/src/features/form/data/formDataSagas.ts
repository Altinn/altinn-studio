import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFormDataSaga, watchFetchFormDataInitialSaga } from './fetch/fetchFormDataSagas';
import { watchSaveFormDataSaga, watchSubmitFormSaga, watchAutoSaveSaga } from './submit/submitFormDataSagas';
import { watchUpdateFormDataSaga, watchDeleteAttachmentReferenceSaga } from './update/updateFormDataSagas';

export default function* formDataSagas(): SagaIterator {
  yield fork(watchFormDataSaga);
  yield fork(watchSaveFormDataSaga);
  yield fork(watchSubmitFormSaga);
  yield fork(watchUpdateFormDataSaga);
  yield fork(watchDeleteAttachmentReferenceSaga);
  yield fork(watchFetchFormDataInitialSaga);
  yield fork(watchAutoSaveSaga);
}
