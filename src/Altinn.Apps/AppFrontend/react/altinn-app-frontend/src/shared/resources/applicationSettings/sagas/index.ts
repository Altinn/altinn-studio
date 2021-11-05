import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';

import { watchGetApplicationSettingsSaga } from './get';

export default function* applicationSettingsSagas(): SagaIterator {
  yield fork(watchGetApplicationSettingsSaga);
}
