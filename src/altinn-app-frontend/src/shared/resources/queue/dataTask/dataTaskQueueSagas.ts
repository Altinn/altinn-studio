import type { SagaIterator } from 'redux-saga';
import { put, takeEvery } from 'redux-saga/effects';
import { DataModelActions } from 'src/features/form/datamodel/datamodelSlice';
import { FormDataActions } from '../../../../features/form/data/formDataSlice';
import { FormLayoutActions } from '../../../../features/form/layout/formLayoutSlice';
import {
  startInitialDataTaskQueue,
  startInitialDataTaskQueueFulfilled,
} from '../queueSlice';
import { AttachmentActions } from 'src/shared/resources/attachments/attachmentSlice';

export function* startInitialDataTaskQueueSaga(): SagaIterator {
  yield put(FormDataActions.fetchInitial());
  yield put(DataModelActions.fetchJsonSchema());
  yield put(FormLayoutActions.fetchSets());
  yield put(FormLayoutActions.fetch());
  yield put(FormLayoutActions.fetchSettings());
  yield put(AttachmentActions.mapAttachments());
  yield put(startInitialDataTaskQueueFulfilled());
}

export function* watchStartInitialDataTaskQueueSaga(): SagaIterator {
  yield takeEvery(startInitialDataTaskQueue, startInitialDataTaskQueueSaga);
}
