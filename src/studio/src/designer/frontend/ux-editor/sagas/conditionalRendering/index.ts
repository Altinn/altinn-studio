import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchAddConditionalRenderingSaga, watchDelConditionalRenderingSaga, watchUpdateConditionalRenderingConnectedIdsSaga } from './conditionalRenderingSagas';

// eslint-disable-next-line func-names
export default function* (): SagaIterator {
  yield fork(watchAddConditionalRenderingSaga);
  yield fork(watchDelConditionalRenderingSaga);
  yield fork(watchUpdateConditionalRenderingConnectedIdsSaga);
}
