import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchGetApplicationSettingsSaga } from './fetch/fetchApplicationSettingsSaga';

// eslint-disable-next-line func-names
export default function* (): SagaIterator {
  yield fork(watchGetApplicationSettingsSaga);
}
