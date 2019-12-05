import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';

import {
  watchRunSingleFieldValidationSaga,
} from './singleFieldValidation';

export default function*(): SagaIterator {
  yield fork(watchRunSingleFieldValidationSaga);
}
