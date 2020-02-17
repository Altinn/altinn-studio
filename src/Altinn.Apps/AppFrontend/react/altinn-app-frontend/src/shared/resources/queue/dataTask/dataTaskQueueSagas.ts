import { SagaIterator } from 'redux-saga';
import { all, call, take } from 'redux-saga/effects';
import FormDataActions from '../../../../features/form/data/formDataActions';
import DataModelActions from '../../../../features/form/datamodel/formDatamodelActions';
import FormLayoutActions from '../../../../features/form/layout/formLayoutActions';
import { IAltinnWindow } from './../../../../types/global';
import { FETCH_APPLICATION_METADATA_FULFILLED } from './../../applicationMetadata/actions/types';
import { GET_INSTANCEDATA_FULFILLED } from './../../instanceData/get/getInstanceDataActionTypes';
import QueueActions from './../queueActions';

export function* startInitialDataTaskQueue(): SagaIterator {
  const { org, app } = window as Window as IAltinnWindow;

  yield call(
    DataModelActions.fetchDataModel,
    `${window.location.origin}/${org}/${app}/api/metadata/ServiceMetaData`,
  );

  yield call(
    FormLayoutActions.fetchFormLayout,
    `${window.location.origin}/${org}/${app}/api/resource/FormLayout.json`,
  );

  yield call(FormDataActions.fetchFormDataInitial);

  yield call(
    QueueActions.startInitialDataTaskQueueFulfilled,
  );
}

export function* watchStartInitialDataTaskQueueSaga(): SagaIterator {
  yield all([
    take(QueueActions.startInitialDataTaskQueue),
    take(FETCH_APPLICATION_METADATA_FULFILLED),
    take(GET_INSTANCEDATA_FULFILLED),
  ]);

  yield call(startInitialDataTaskQueue);
}
