import type { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';

import {
  watchAddActiveFormContainerSaga,
  watchDeleteActiveListSaga,
} from './activeList/activeListSagas';

export default function* formDesignerSagas(): SagaIterator {
  yield fork(watchAddActiveFormContainerSaga);
  yield fork(watchDeleteActiveListSaga);
}
