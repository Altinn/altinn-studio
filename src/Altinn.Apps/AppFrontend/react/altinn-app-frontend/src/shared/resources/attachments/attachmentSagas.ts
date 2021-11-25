import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchDeleteAttachmentSaga } from './delete/deleteAttachmentSagas';
import { watchMapAttachmentsSaga } from './map/mapAttachmentsSagas';
import { watchUpdateAttachmentSaga } from './update/updateAttachmentSagas';
import { watchUploadAttachmentSaga } from './upload/uploadAttachmentSagas';

export default function* attachmentSagas(): SagaIterator {
  yield fork(watchUploadAttachmentSaga);
  yield fork(watchUpdateAttachmentSaga);
  yield fork(watchDeleteAttachmentSaga);
  yield fork(watchMapAttachmentsSaga);
}
