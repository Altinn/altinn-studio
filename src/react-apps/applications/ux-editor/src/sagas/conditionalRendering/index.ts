import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import {
  watchAddConditionalRenderingSaga,
  watchDelConditionalRenderingSaga,
} from './conditionalRenderingSagas';

export default function*(): SagaIterator {
  yield fork(watchAddConditionalRenderingSaga);
  yield fork(watchDelConditionalRenderingSaga);
}
