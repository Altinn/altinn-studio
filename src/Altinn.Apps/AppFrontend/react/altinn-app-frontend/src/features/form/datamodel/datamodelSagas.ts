import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFetchJsonSchemaSaga } from './fetch/fetchFormDatamodelSagas';

export default function* datamodelSagas(): SagaIterator {
  yield fork(watchFetchJsonSchemaSaga);
}
