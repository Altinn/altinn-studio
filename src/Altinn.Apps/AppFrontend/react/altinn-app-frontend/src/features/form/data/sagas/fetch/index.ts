import { SagaIterator } from 'redux-saga';
import {
  call,
  select,
  takeLatest,
  all,
  take,
} from 'redux-saga/effects';
import { get, getCurrentTaskDataTypeId } from 'altinn-shared/utils';
import { convertModelToDataBinding } from '../../../../../utils/databindings';
import FormActions from '../../actions';
import { IFetchFormData } from '../../actions/fetch';
import * as FormDataActionTypes from '../../actions/types';
import { IRuntimeState, IAltinnWindow } from '../../../../../types';
import { IApplicationMetadata } from '../../../../../shared/resources/applicationMetadata';
import { IInstance } from 'altinn-shared/types';
import { FETCH_DATA_MODEL_FULFILLED } from '../../../datamodell/actions/types';
import FormRulesActions from '../../../rules/actions';
import FormDynamicsRules from '../../../dynamics/actions';
import QueueActions from '../../../../../shared/resources/queue/queueActions';

const SelectFormDataModel: (store: any) => any = (store: any) => store.formDataModel.dataModel;
const appMetaDataSelector = (state: IRuntimeState): IApplicationMetadata =>
  state.applicationMetadata.applicationMetadata;
const instanceDataSelector = (state: IRuntimeState): IInstance =>
  state.instanceData.instance;

function* fetchFormDataSaga({ url }: IFetchFormData): SagaIterator {
  try {
    const fetchedData: any = yield call(get, url);
    const dataModel = yield select(SelectFormDataModel);
    const parsedLayout = convertModelToDataBinding(fetchedData, dataModel);
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
    const { org, app, instanceId } = window as Window as IAltinnWindow;
    // This is a temporary solution for the "one task - one datamodel - process"
    const applicationMetadata: IApplicationMetadata = yield select(appMetaDataSelector);
    const instance: IInstance = yield select(instanceDataSelector);

    const currentTaskDataTypeId = getCurrentTaskDataTypeId(applicationMetadata, instance);
    const url = `${window.location.origin}/${org}/${app}/instances/${instanceId}/data/${currentTaskDataTypeId}`;
    const fetchedData: any = yield call(get, url);
    const dataModel = yield select(SelectFormDataModel);

    const parsedLayout = convertModelToDataBinding(fetchedData, dataModel);
    yield call(FormActions.fetchFormDataFulfilled, parsedLayout);

    yield call(
      FormRulesActions.fetchRuleModel,
      `${window.location.origin}/${org}/${app}/api/resource/RuleHandler.js`,
    );
  
    yield call(
      FormDynamicsRules.fetchFormDynamics,
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
    take(FormDataActionTypes.FETCH_FORM_DATA_INITIAL)
  ]);

  yield call(fetchFormDataInitialSaga);
}
