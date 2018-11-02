import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import {
  watchFetchCodeListsSaga,
} from './codeListsSagas';

/**
 * Export the CodeLists sagas
 */
export default function*(): SagaIterator {
  yield fork(watchFetchCodeListsSaga);
}
