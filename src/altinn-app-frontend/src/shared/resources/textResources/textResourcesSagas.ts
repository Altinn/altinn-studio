import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';

import { watchFetchTextResourcesSaga } from './fetch/fetchTextResourcesSagas';
import { parseText, watchFetchFormDataFulfilled } from './replace/replaceTextResourcesSagas';

export default function*(): SagaIterator {
  yield fork(watchFetchTextResourcesSaga);
  yield fork(watchFetchFormDataFulfilled);
  yield fork(parseText);
}
