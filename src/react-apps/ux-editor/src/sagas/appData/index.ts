import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFetchDataModelSaga, watchFetchRuleModelSaga, watchLoadTextResourcesSaga } from './appDataSagas';

export default function*(): SagaIterator {
  yield fork(watchFetchDataModelSaga);
  yield fork(watchLoadTextResourcesSaga);
  yield fork(watchFetchRuleModelSaga);
}
