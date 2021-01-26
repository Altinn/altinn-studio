import { SagaIterator } from 'redux-saga';
import { call, takeEvery } from 'redux-saga/effects';
import { IAltinnWindow } from 'src/types';
import FormDataActions from '../../../../features/form/data/formDataActions';
import FormLayoutActions from '../../../../features/form/layout/formLayoutActions';
import QueueActions from '../queueActions';
import { START_INITIAL_DATA_TASK_QUEUE } from './dataTaskQueueActionTypes';
import DataModelActions from '../../../../features/form/datamodel/formDatamodelActions';

export function* startInitialDataTaskQueue(): SagaIterator {
  const { org, app } = window as Window as IAltinnWindow;
  yield call(FormDataActions.fetchFormDataInitial);
  yield call(DataModelActions.fetchJsonSchema);
  yield call(DataModelActions.fetchDataModel, `${window.location.origin}/${org}/${app}/api/metadata/ServiceMetaData`);
  yield call(FormLayoutActions.fetchFormLayoutSets);
  yield call(FormLayoutActions.fetchFormLayout);
  yield call(FormLayoutActions.fetchFormLayoutSettings);

  yield call(
    QueueActions.startInitialDataTaskQueueFulfilled,
  );
}

export function* watchStartInitialDataTaskQueueSaga(): SagaIterator {
  yield takeEvery(START_INITIAL_DATA_TASK_QUEUE, startInitialDataTaskQueue);
}
