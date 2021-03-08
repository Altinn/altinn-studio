import { SagaIterator } from 'redux-saga';
import { call, put, takeEvery } from 'redux-saga/effects';
import { fetchJsonSchema } from 'src/features/form/datamodel/datamodelSlice';
import FormDataActions from '../../../../features/form/data/formDataActions';
import { FormLayoutActions } from '../../../../features/form/layout/formLayoutSlice';
import QueueActions from '../queueActions';
import { START_INITIAL_DATA_TASK_QUEUE } from './dataTaskQueueActionTypes';

export function* startInitialDataTaskQueue(): SagaIterator {
  yield call(FormDataActions.fetchFormDataInitial);
  yield put(fetchJsonSchema());
  yield put(FormLayoutActions.fetchLayoutSets());
  yield put(FormLayoutActions.fetchLayout());
  yield put(FormLayoutActions.fetchLayoutSettings());

  yield call(
    QueueActions.startInitialDataTaskQueueFulfilled,
  );
}

export function* watchStartInitialDataTaskQueueSaga(): SagaIterator {
  yield takeEvery(START_INITIAL_DATA_TASK_QUEUE, startInitialDataTaskQueue);
}
