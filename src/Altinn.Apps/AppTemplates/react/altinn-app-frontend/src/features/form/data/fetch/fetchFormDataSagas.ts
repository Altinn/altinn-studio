import { SagaIterator } from 'redux-saga';
import {
  call,
  select,
  takeLatest,
  all,
  take,
} from 'redux-saga/effects';
import { get, getCurrentTaskDataTypeId } from 'altinn-shared/utils';
import { IInstance } from 'altinn-shared/types';
import { convertModelToDataBinding } from '../../../../utils/databindings';
import FormActions from '../formDataActions';
import { IFetchFormData } from './fetchFormDataActions';
import * as FormDataActionTypes from '../formDataActionTypes';
import { IRuntimeState, IAltinnWindow } from '../../../../types';
import { IApplicationMetadata } from '../../../../shared/resources/applicationMetadata';
import { FETCH_DATA_MODEL_FULFILLED, FETCH_JSON_SCHEMA_FULFILLED } from '../../datamodel/fetch/fetchFormDatamodelActionTypes';
import FormRulesActions from '../../rules/rulesActions';
import FormDynamicsActions from '../../dynamics/formDynamicsActions';
import QueueActions from '../../../../shared/resources/queue/queueActions';

const appMetaDataSelector =
  (state: IRuntimeState): IApplicationMetadata => state.applicationMetadata.applicationMetadata;
const instanceDataSelector = (state: IRuntimeState): IInstance => state.instanceData.instance;

function* fetchFormDataSaga({ url }: IFetchFormData): SagaIterator {
  try {
    const fetchedData: any = yield call(get, url);
    const parsedLayout = convertModelToDataBinding(fetchedData);
    yield call(FormActions.fetchFormDataFulfilled, parsedLayout);
  } catch (err) {
    yield call(FormActions.fetchFormDataRejected, err);
  }
}

export function* watchFormDataSaga(): SagaIterator {
  yield takeLatest(FormDataActionTypes.FETCH_FORM_DATA, fetchFormDataSaga);
}

function* fetchFormDataInitialSaga(): SagaIterator {
  try {
    const {
      org,
      app,
      instanceId,
    } = window as Window as IAltinnWindow;
    // This is a temporary solution for the "one task - one datamodel - process"
    const applicationMetadata: IApplicationMetadata = yield select(appMetaDataSelector);
    const instance: IInstance = yield select(instanceDataSelector);

    const currentTaskDataId = getCurrentTaskDataTypeId(applicationMetadata, instance);
    const url = `${window.location.origin}/${org}/${app}/instances/${instanceId}/data/${currentTaskDataId}`;
    const fetchedData: any = yield call(get, url);

    const parsedLayout = convertModelToDataBinding(fetchedData);
    yield call(FormActions.fetchFormDataFulfilled, parsedLayout);

    yield call(
      FormRulesActions.fetchRuleModel,
      `${window.location.origin}/${org}/${app}/api/resource/RuleHandler.js`,
    );

    yield call(
      FormDynamicsActions.fetchFormDynamics,
      `${window.location.origin}/${org}/${app}/api/resource/RuleConfiguration.json`,
    );
  } catch (err) {
    yield call(FormActions.fetchFormDataRejected, err);
    yield call(QueueActions.dataTaskQueueError, err);
  }
}

export function* watchFetchFormDataInitialSaga(): SagaIterator {
  yield all([
    take(FETCH_DATA_MODEL_FULFILLED),
    take(FETCH_JSON_SCHEMA_FULFILLED),
    take(FormDataActionTypes.FETCH_FORM_DATA_INITIAL),
  ]);

  yield call(fetchFormDataInitialSaga);
}
