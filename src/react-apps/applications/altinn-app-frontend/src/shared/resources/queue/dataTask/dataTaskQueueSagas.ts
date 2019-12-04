import { SagaIterator } from 'redux-saga';
import { all, call, select, take } from 'redux-saga/effects';
import { IInstance } from './../../../../../../shared/src/types';
import { getCurrentTaskDataTypeId } from './../../../../../../shared/src/utils/applicationMetaDataUtils';
import { IRuntimeState } from './../../../../../src/types';
import FormDataActions from './../../../../features/form/data/actions';
import DataModelActions from './../../../../features/form/datamodell/actions';
import FormDynamicsRules from './../../../../features/form/dynamics/actions';
import FormLayoutActions from './../../../../features/form/layout/actions';
import FormRulesActions from './../../../../features/form/rules/actions';
import { IAltinnWindow } from './../../../../types/global';
import { IApplicationMetadata } from './../../applicationMetadata';
import { FETCH_APPLICATION_METADATA_FULFILLED } from './../../applicationMetadata/actions/types';
import { GET_INSTANCEDATA_FULFILLED } from './../../instanceData/get/getInstanceDataActionTypes';
import QueueActions from './../queueActions';

const appMetaDataSelector = (state: IRuntimeState): IApplicationMetadata =>
  state.applicationMetadata.applicationMetadata;

const instanceDataSelector = (state: IRuntimeState): IInstance =>
  state.instanceData.instance;

export function* startInitialDataTaskQueue(): SagaIterator {
  const { org, app, instanceId } = window as Window as IAltinnWindow;

  yield call(
    DataModelActions.fetchDataModel,
    `${window.location.origin}/${org}/${app}/api/metadata/ServiceMetaData`,
  );

  yield call(
    FormLayoutActions.fetchFormLayout,
    `${window.location.origin}/${org}/${app}/api/resource/FormLayout.json`,
  );

  // This is a temporary solution for the "one task - one datamodel - process"
  const applicationMetadata: IApplicationMetadata = yield select(appMetaDataSelector);
  const instance: IInstance = yield select(instanceDataSelector);

  const currentTaskDataTypeId = getCurrentTaskDataTypeId(applicationMetadata, instance);

  // org/app/instances/{instanceId}/data/{dataGuid}
  yield call(
    FormDataActions.fetchFormData,
    `${window.location.origin}/${org}/${app}/instances/${instanceId}/data/${currentTaskDataTypeId}`,
  );

  yield call(
    FormRulesActions.fetchRuleModel,
    `${window.location.origin}/${org}/${app}/api/resource/RuleHandler.js`,
  );

  yield call(
    FormDynamicsRules.fetchFormDynamics,
    `${window.location.origin}/${org}/${app}/api/resource/RuleConfiguration.json`,
  );

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
