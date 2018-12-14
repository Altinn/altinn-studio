import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import {
  watchUpdateContainerListSaga,
} from './editContainerSagas';

export default function*(): SagaIterator {
  yield fork(watchUpdateContainerListSaga);
}
