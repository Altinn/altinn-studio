import { SagaIterator } from 'redux-saga';
import { all, call, take } from 'redux-saga/effects';
import { IAltinnWindow } from 'src/types';
import FormDataActions from '../../../features/form/data/formDataActions';
import DataModelActions from '../../../features/form/datamodel/formDatamodelActions';
import { FETCH_APPLICATION_METADATA_FULFILLED } from '../../applicationMetadata/actions/types';
import { GET_INSTANCEDATA_FULFILLED } from '../../instanceData/get/getInstanceDataActionTypes';
import QueueActions from '../queueActions';
import { START_INITIAL_DATA_TASK_QUEUE } from './dataTaskQueueActionTypes';

export function* startInitialDataTaskQueue(): SagaIterator {
  const { org, app } = window as Window as IAltinnWindow;

  yield call(
    DataModelActions.fetchDataModel,
    `${window.location.origin}/${org}/${app}/api/metadata/ServiceMetaData`,
  );

  yield call(
    DataModelActions.fetchJsonSchema,
    `${window.location.origin}/${org}/${app}/api/jsonschema/`,
  );

  yield call(FormDataActions.fetchFormDataInitial);

  yield call(
    QueueActions.startInitialDataTaskQueueFulfilled,
  );
}

export function* watchStartInitialDataTaskQueueSaga(): SagaIterator {
  yield all([
    take(START_INITIAL_DATA_TASK_QUEUE),
    take(FETCH_APPLICATION_METADATA_FULFILLED),
    take(GET_INSTANCEDATA_FULFILLED),
  ]);

  yield call(startInitialDataTaskQueue);
}
