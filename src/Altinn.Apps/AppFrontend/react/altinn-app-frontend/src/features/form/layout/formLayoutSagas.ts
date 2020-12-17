import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFetchFormLayoutSaga, watchFetchFormLayoutSettingsSaga, watchUpdateCurrentViewSaga } from './fetch/fetchFormLayoutSagas';
import { watchUpdateFocusSaga, watchUpdateAutoSave, watchUpdateRepeatingGroupsSaga } from './update/updateFormLayoutSagas';

// eslint-disable-next-line func-names
export default function* (): SagaIterator {
  yield fork(watchFetchFormLayoutSaga);
  yield fork(watchUpdateFocusSaga);
  yield fork(watchUpdateAutoSave);
  yield fork(watchUpdateRepeatingGroupsSaga);
  yield fork(watchFetchFormLayoutSettingsSaga);
  yield fork(watchUpdateCurrentViewSaga);
}
