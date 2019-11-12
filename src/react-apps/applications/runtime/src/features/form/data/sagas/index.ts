import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFormDataSaga } from './fetch';
import { watchSubmitFormSaga } from './submit';
import { watchUpdateFormDataSaga } from './update';

export default function*(): SagaIterator {
  yield fork(watchFormDataSaga);
  yield fork(watchSubmitFormSaga);
  yield fork(watchUpdateFormDataSaga);
}
