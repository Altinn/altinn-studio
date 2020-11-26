import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';

import { watchRunSingleFieldValidationSaga } from './singleField/singleFieldValidationSagas';

export default function* validationSagas(): SagaIterator {
  yield fork(watchRunSingleFieldValidationSaga);
}
