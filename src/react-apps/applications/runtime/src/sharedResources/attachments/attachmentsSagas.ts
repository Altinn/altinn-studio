import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchDeleteAttachmentSaga } from './delete/deleteAttachmentsSagas';
import { watchFetchAttachmentsSaga } from './fetch/fetchAttachmentsSagas';
import { watchUploadAttachmentSaga } from './upload/uploadAttachmentsSagas';

export default function*(): SagaIterator {
  yield fork(watchUploadAttachmentSaga);
  yield fork(watchDeleteAttachmentSaga);
  yield fork(watchFetchAttachmentsSaga);
}
