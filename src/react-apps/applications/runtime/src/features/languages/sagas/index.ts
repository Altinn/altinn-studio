import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFetchLanguageSaga } from './fetch';

export default function*(): SagaIterator {
  yield fork(watchFetchLanguageSaga);
}
