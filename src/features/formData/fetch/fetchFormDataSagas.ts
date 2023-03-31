import { all, call, put, select, take } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { DataModelActions } from 'src/features/datamodel/datamodelSlice';
import { FormDynamicsActions } from 'src/features/dynamics/formDynamicsSlice';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { FormRulesActions } from 'src/features/formRules/rulesSlice';
import { InstanceDataActions } from 'src/features/instanceData/instanceDataSlice';
import { QueueActions } from 'src/features/queue/queueSlice';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import {
  appMetaDataSelector,
  currentSelectedPartyIdSelector,
  instanceDataSelector,
  layoutSetsSelector,
  processStateSelector,
} from 'src/selectors/simpleSelectors';
import { getCurrentTaskDataElementId, getDataTypeByLayoutSetId, isStatelessApp } from 'src/utils/appMetadata';
import { convertModelToDataBinding } from 'src/utils/databindings';
import { putWithoutConfig } from 'src/utils/network/networking';
import { httpGet } from 'src/utils/network/sharedNetworking';
import { waitFor } from 'src/utils/sagas';
import {
  getFetchFormDataUrl,
  getStatelessFormDataUrl,
  invalidateCookieUrl,
  redirectToUpgrade,
} from 'src/utils/urls/appUrlHelper';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { IProcessState } from 'src/features/process';
import type { ILayoutSets } from 'src/types';
import type { IInstance } from 'src/types/shared';

export function* fetchFormDataSaga(): SagaIterator {
  try {
    // This is a temporary solution for the "one task - one datamodel - process"
    const applicationMetadata: IApplicationMetadata = yield select(appMetaDataSelector);
    const instance: IInstance = yield select(instanceDataSelector);
    const layoutSets: ILayoutSets = yield select(layoutSetsSelector);
    const currentTaskDataElementId = getCurrentTaskDataElementId(applicationMetadata, instance, layoutSets);
    if (currentTaskDataElementId) {
      const fetchedData: any = yield call(httpGet, getFetchFormDataUrl(instance.id, currentTaskDataElementId));
      const formData = convertModelToDataBinding(fetchedData);
      yield put(FormDataActions.fetchFulfilled({ formData }));
    } else {
      yield put(FormDataActions.fetchRejected({ error: null }));
    }
  } catch (error) {
    yield put(FormDataActions.fetchRejected({ error }));
  }
}

export function* fetchFormDataInitialSaga(): SagaIterator {
  try {
    // This is a temporary solution for the "one task - one datamodel - process"
    const applicationMetadata: IApplicationMetadata = yield select(appMetaDataSelector);
    let fetchedData: any;
    if (isStatelessApp(applicationMetadata)) {
      // stateless app
      fetchedData = yield call(fetchFormDataStateless, applicationMetadata);
    } else {
      // app with instance
      const instance: IInstance = yield select(instanceDataSelector);
      const layoutSets: ILayoutSets = yield select(layoutSetsSelector);
      const currentTaskDataId = getCurrentTaskDataElementId(applicationMetadata, instance, layoutSets);
      if (currentTaskDataId) {
        fetchedData = yield call(httpGet, getFetchFormDataUrl(instance.id, currentTaskDataId));
      }
    }

    const formData = convertModelToDataBinding(fetchedData);
    yield put(FormDataActions.fetchFulfilled({ formData }));
    yield put(FormRulesActions.fetch());
    yield put(FormDynamicsActions.fetch());
  } catch (error) {
    yield put(FormDataActions.fetchRejected({ error }));
    yield put(QueueActions.dataTaskQueueError({ error }));
  }
}

function* fetchFormDataStateless(applicationMetadata: IApplicationMetadata) {
  const layoutSets: ILayoutSets = yield select(layoutSetsSelector);
  const dataType = getDataTypeByLayoutSetId(applicationMetadata.onEntry?.show, layoutSets);

  const allowAnonymous = yield select(makeGetAllowAnonymousSelector());

  let options = {};

  if (!allowAnonymous) {
    const selectedPartyId = yield select(currentSelectedPartyIdSelector);
    options = {
      headers: {
        party: `partyid:${selectedPartyId}`,
      },
    };
  }

  if (!dataType) {
    return;
  }

  try {
    return yield call(httpGet, getStatelessFormDataUrl(dataType, allowAnonymous), options);
  } catch (error) {
    if (error?.response?.status === 403 && error.response.data) {
      const reqAuthLevel = error.response.data.RequiredAuthenticationLevel;
      if (reqAuthLevel) {
        putWithoutConfig(invalidateCookieUrl);
        yield call(redirectToUpgrade, reqAuthLevel);
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }
}

export function* watchFetchFormDataInitialSaga(): SagaIterator {
  while (true) {
    yield take(FormDataActions.fetchInitial);
    const processState: IProcessState = yield select(processStateSelector);
    const instance: IInstance = yield select(instanceDataSelector);
    const application: IApplicationMetadata = yield select(appMetaDataSelector);
    if (isStatelessApp(application)) {
      yield take(DataModelActions.fetchJsonSchemaFulfilled);
      const allowAnonymous = yield select(makeGetAllowAnonymousSelector());
      if (!allowAnonymous) {
        yield waitFor((state) => currentSelectedPartyIdSelector(state) !== undefined);
      }
    } else if (!processState || !instance || processState.taskId !== instance.process.currentTask?.elementId) {
      yield all([take(InstanceDataActions.getFulfilled), take(DataModelActions.fetchJsonSchemaFulfilled)]);
    }
    yield call(fetchFormDataInitialSaga);
  }
}
