import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFetchJsonSchemaSaga } from './fetch/fetchFormDatamodelSagas';

export default function* formDataModelSagas(): SagaIterator {
  yield fork(watchFetchJsonSchemaSaga);
}
