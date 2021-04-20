import { SagaIterator } from 'redux-saga';
import { put, takeEvery } from 'redux-saga/effects';
import { fetchJsonSchema } from 'src/features/form/datamodel/datamodelSlice';
import FormDataActions from '../../../../features/form/data/formDataActions';
import { FormLayoutActions } from '../../../../features/form/layout/formLayoutSlice';
import { startInitialDataTaskQueue, startInitialDataTaskQueueFulfilled } from '../queueSlice';

export function* startInitialDataTaskQueueSaga(): SagaIterator {
  yield put(FormDataActions.fetchFormDataInitial());
  yield put(fetchJsonSchema());
  yield put(FormLayoutActions.fetchLayoutSets());
  yield put(FormLayoutActions.fetchLayout());
  yield put(FormLayoutActions.fetchLayoutSettings());
  yield put(startInitialDataTaskQueueFulfilled());
}

export function* watchStartInitialDataTaskQueueSaga(): SagaIterator {
  yield takeEvery(startInitialDataTaskQueue, startInitialDataTaskQueueSaga);
}
