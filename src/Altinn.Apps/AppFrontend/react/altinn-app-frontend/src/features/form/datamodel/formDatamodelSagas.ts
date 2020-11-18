import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';

import { watchFetchFormDataModelSaga, watchFetchJsonSchemaSaga } from './fetch/fetchFormDatamodelSagas';

export default function* formDataModelSagas(): SagaIterator {
  yield fork(watchFetchFormDataModelSaga);
  yield fork(watchFetchJsonSchemaSaga);
}
