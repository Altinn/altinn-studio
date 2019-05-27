import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchDeleteAttachmentSaga } from './delete';
import { watchFetchAttachmentsSaga } from './fetch';
import { watchUploadAttachmentSaga } from './upload';

export default function*(): SagaIterator {
  yield fork(watchUploadAttachmentSaga);
  yield fork(watchDeleteAttachmentSaga);
  yield fork(watchFetchAttachmentsSaga);
}
