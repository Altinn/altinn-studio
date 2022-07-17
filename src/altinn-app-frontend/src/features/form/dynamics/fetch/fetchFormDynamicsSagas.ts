import type { SagaIterator } from 'redux-saga';
import { call, select, put } from 'redux-saga/effects';
import type { IInstance } from 'altinn-shared/types';
import type { IApplicationMetadata } from 'src/shared/resources/applicationMetadata';
import { getFetchFormDynamicsUrl } from 'src/utils/appUrlHelper';
import { get } from '../../../../utils/networking';
import { FormDynamicsActions } from '../formDynamicsSlice';
import { QueueActions } from '../../../../shared/resources/queue/queueSlice';
import type { IRuntimeState, ILayoutSets } from '../../../../types';
import { getLayoutSetIdForApplication } from '../../../../utils/appMetadata';

const layoutSetsSelector = (state: IRuntimeState) =>
  state.formLayout.layoutsets;
const instanceSelector = (state: IRuntimeState) => state.instanceData.instance;
const applicationMetadataSelector = (state: IRuntimeState) =>
  state.applicationMetadata.applicationMetadata;

export function* fetchDynamicsSaga(): SagaIterator {
  try {
    const layoutSets: ILayoutSets = yield select(layoutSetsSelector);
    const instance: IInstance = yield select(instanceSelector);
    const application: IApplicationMetadata = yield select(
      applicationMetadataSelector,
    );
    const layoutSetId = getLayoutSetIdForApplication(
      application,
      instance,
      layoutSets,
    );
    const url = getFetchFormDynamicsUrl(layoutSetId);

    const result: any = yield call(get, url);
    const data = result ? result.data : {};
    yield put(
      FormDynamicsActions.fetchFulfilled({
        apis: data.APIs,
        ruleConnection: data.ruleConnection,
        conditionalRendering: data.conditionalRendering,
      }),
    );
  } catch (error) {
    yield put(FormDynamicsActions.fetchRejected({ error }));
    yield put(QueueActions.dataTaskQueueError({ error }));
  }
}
