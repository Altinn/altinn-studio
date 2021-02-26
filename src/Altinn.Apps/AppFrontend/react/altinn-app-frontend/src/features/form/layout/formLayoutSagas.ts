import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFetchFormLayoutSaga, watchFetchFormLayoutSettingsSaga, watchFetchFormLayoutSetsSaga } from './fetch/fetchFormLayoutSagas';
import { watchUpdateFocusSaga, watchUpdateRepeatingGroupsSaga, watchUpdateCurrentViewSaga } from './update/updateFormLayoutSagas';

// eslint-disable-next-line func-names
export default function* (): SagaIterator {
  yield fork(watchFetchFormLayoutSaga);
  yield fork(watchUpdateFocusSaga);
  yield fork(watchUpdateRepeatingGroupsSaga);
  yield fork(watchFetchFormLayoutSettingsSaga);
  yield fork(watchUpdateCurrentViewSaga);
  yield fork(watchFetchFormLayoutSetsSaga);
}
