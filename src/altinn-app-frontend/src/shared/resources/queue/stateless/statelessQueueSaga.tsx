import type { SagaIterator } from '@redux-saga/types';
import { put, takeLatest } from 'redux-saga/effects';
import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { DataModelActions } from 'src/features/form/datamodel/datamodelSlice';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { startStatelessIsLoading } from '../../isLoading/isLoadingSlice';
import {
  startInitialStatelessQueue,
  startInitialStatelessQueueFulfilled,
  statelessQueueError,
} from '../queueSlice';

export function* startInitialStatelessQueueSaga(): SagaIterator {
  try {
    yield put(startStatelessIsLoading());
    yield put(FormDataActions.fetchInitial());
    yield put(DataModelActions.fetchJsonSchema());
    yield put(FormLayoutActions.fetchSets());
    yield put(FormLayoutActions.fetch());
    yield put(FormLayoutActions.fetchSettings());
    yield put(startInitialStatelessQueueFulfilled());
  } catch (error) {
    yield put(statelessQueueError({ error }));
  }
}

export function* watchStartInitialStatelessQueueSaga(): SagaIterator {
  yield takeLatest(startInitialStatelessQueue, startInitialStatelessQueueSaga);
}
