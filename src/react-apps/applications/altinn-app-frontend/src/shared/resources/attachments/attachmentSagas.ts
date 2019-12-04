import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchDeleteAttachmentSaga } from './delete/deleteAttachmentSagas';
import { watchMapAttachmentsSaga } from './map/mapAttachmentsSagas';
import { watchUploadAttachmentSaga } from './upload/uploadAttachmentSagas';

export default function* (): SagaIterator {
  yield fork(watchUploadAttachmentSaga);
  yield fork(watchDeleteAttachmentSaga);
  yield fork(watchMapAttachmentsSaga);
}
