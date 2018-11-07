import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFetchFormDataSaga, watchResetFormDataSaga, watchSubmitFormDataSaga, watchUpdateFormDataSaga } from './formFillerSagas';

export default function*(): SagaIterator {
  yield fork(watchUpdateFormDataSaga);
  yield fork(watchSubmitFormDataSaga);
  yield fork(watchFetchFormDataSaga);
  yield fork(watchResetFormDataSaga);
}
