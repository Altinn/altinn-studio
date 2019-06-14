import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchDeleteAttachmentSaga } from './delete/deleteAttachmentSagas';
import { watchFetchAttachmentsSaga } from './fetch/fetchAttachmentsSagas';
import { watchUploadAttachmentSaga } from './upload/uploadAttachmentSagas';

export default function* (): SagaIterator {
  yield fork(watchUploadAttachmentSaga);
  yield fork(watchDeleteAttachmentSaga);
  yield fork(watchFetchAttachmentsSaga);
}
