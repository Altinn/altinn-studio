import { SagaIterator } from 'redux-saga';
import { call, takeLatest, select, put } from 'redux-saga/effects';
import { IAltinnWindow, IInstance } from 'altinn-shared/types';
import { IApplicationMetadata } from 'src/shared/resources/applicationMetadata';
import { get } from '../../../../utils/networking';
import FormDynamicsActions from '../formDynamicsActions';
import { IFetchServiceConfig } from './fetchFormDynamicsActions';
import * as FormDynamicsActionTypes from '../formDynamicsActionTypes';
import { dataTaskQueueError } from '../../../../shared/resources/queue/queueSlice';
import { IRuntimeState, ILayoutSets } from '../../../../types';
import { getLayoutsetForDataElement } from '../../../../utils/layout';
import { getDataTaskDataTypeId } from '../../../../utils/appMetadata';

const layoutSetsSelector = (state: IRuntimeState) => state.formLayout.layoutsets;
const instanceSelector = (state: IRuntimeState) => state.instanceData.instance;
const applicationMetadataSelector = (state: IRuntimeState) => state.applicationMetadata.applicationMetadata;

function* fetchDynamicsSaga({ url }: IFetchServiceConfig): SagaIterator {
  try {
    const { org, app } = window as Window as IAltinnWindow;
    const layoutSets: ILayoutSets = yield select(layoutSetsSelector);
    const instance: IInstance = yield select(instanceSelector);
    const aplicationMetadataState: IApplicationMetadata = yield select(applicationMetadataSelector);
    const dataType: string = getDataTaskDataTypeId(instance.process.currentTask.elementId,
      aplicationMetadataState.dataTypes);
    let apiUrl: string = url;
    if (layoutSets != null) {
      const layoutSetId: string = getLayoutsetForDataElement(instance, dataType, layoutSets);
      apiUrl = `${window.location.origin}/${org}/${app}/api/ruleconfiguration/${layoutSetId}`;
    }
    const result: any = yield call(get, apiUrl);
    const data = result ? result.data : {};
    yield call(
      FormDynamicsActions.fetchFormDynamicsFulfilled,
      data.APIs,
      data.ruleConnection,
      data.conditionalRendering,
    );
  } catch (error) {
    yield call(FormDynamicsActions.fetchFormDynamicsRejected, error);
    yield put(dataTaskQueueError({ error }));
  }
}

export function* watchFetchDynamics(): SagaIterator {
  yield takeLatest(FormDynamicsActionTypes.FETCH_SERVICE_CONFIG, fetchDynamicsSaga);
}
