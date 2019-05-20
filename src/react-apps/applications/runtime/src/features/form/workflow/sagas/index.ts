import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';

import {
  watchGetCurrentStateSaga,
} from './workflow';

export default function*(): SagaIterator {
  yield fork(watchGetCurrentStateSaga);
}
