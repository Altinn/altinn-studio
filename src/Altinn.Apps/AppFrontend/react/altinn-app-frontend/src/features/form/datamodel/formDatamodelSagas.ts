import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';

import { watchFetchFormDataModelSaga } from './fetch/fetchFormDatamodelSagas';

export default function*(): SagaIterator {
  yield fork(watchFetchFormDataModelSaga);
}
