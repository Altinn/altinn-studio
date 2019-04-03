import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import {
  watchCompleteAndSendInFormSaga,
  watchDeleteAttachmentSaga,
  watchFetchAttachmentsSaga,
  watchFetchFormDataSaga,
  watchResetFormDataSaga,
  watchRunSingleFieldValidationSaga,
  watchSubmitFormDataSaga,
  watchUpdateFormDataSaga,
  watchUploadAttachmentSaga,
} from './formFillerSagas';

export default function* (): SagaIterator {
  yield fork(watchUpdateFormDataSaga);
  yield fork(watchSubmitFormDataSaga);
  yield fork(watchFetchFormDataSaga);
  yield fork(watchResetFormDataSaga);
  yield fork(watchRunSingleFieldValidationSaga);
  yield fork(watchCompleteAndSendInFormSaga);
  yield fork(watchUploadAttachmentSaga);
  yield fork(watchDeleteAttachmentSaga);
  yield fork(watchFetchAttachmentsSaga);
}
