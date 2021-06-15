import { SagaIterator } from '@redux-saga/types';
import { put, takeLatest } from 'redux-saga/effects';
import FormDataActions from 'src/features/form/data/formDataActions';
import { fetchJsonSchema } from 'src/features/form/datamodel/datamodelSlice';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { startStatelessIsLoading } from '../../isLoading/isLoadingSlice';
import { startInitialStatelessQueue, startInitialStatelessQueueFulfilled, statelessQueueError } from '../queueSlice';

export function* startInitialStatelessQueueSaga(): SagaIterator {
  try {
    yield put(startStatelessIsLoading());
    yield put(FormDataActions.fetchFormDataInitial());
    yield put(fetchJsonSchema());
    yield put(FormLayoutActions.fetchLayoutSets());
    yield put(FormLayoutActions.fetchLayout());
    yield put(FormLayoutActions.fetchLayoutSettings());
    yield put(startInitialStatelessQueueFulfilled());
  } catch (error) {
    yield put(statelessQueueError({ error }));
  }
}

export function* watchStartInitialStatelessQueueSaga(): SagaIterator {
  yield takeLatest(startInitialStatelessQueue, startInitialStatelessQueueSaga);
}
