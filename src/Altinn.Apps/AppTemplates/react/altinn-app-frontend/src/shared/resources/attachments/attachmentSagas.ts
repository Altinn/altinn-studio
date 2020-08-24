import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchMapAttachmentsSaga } from './map/mapAttachmentsSagas';

export default function* (): SagaIterator {
  yield fork(watchMapAttachmentsSaga);
}
