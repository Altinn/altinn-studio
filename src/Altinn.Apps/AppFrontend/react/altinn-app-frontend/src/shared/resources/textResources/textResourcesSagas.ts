import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';

import { watchFetchTextResourcesSaga } from './fetch/fetchTextResourcesSagas';
import { watchReplaceTextResourcesSaga } from './replace/replaceTextResourcesSagas';

export default function* textResourceSagas(): SagaIterator {
  yield fork(watchFetchTextResourcesSaga);
  yield fork(watchReplaceTextResourcesSaga);
}
