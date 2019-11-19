import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';

import { watchFetchFormLayoutSaga } from './fetch';
import { watchUpdateFocusSaga } from './update/updateFormLayoutSagas';

export default function*(): SagaIterator {
  yield fork(watchFetchFormLayoutSaga);
  yield fork(watchUpdateFocusSaga);
}
