import { all, call, put, select, take } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { DataModelActions } from 'src/features/form/datamodel/datamodelSlice';
import { FormDynamicsActions } from 'src/features/form/dynamics/formDynamicsSlice';
import { FormRulesActions } from 'src/features/form/rules/rulesSlice';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import {
  appMetaDataSelector,
  currentSelectedPartyIdSelector,
  instanceDataSelector,
  layoutSetsSelector,
  processStateSelector,
} from 'src/selectors/simpleSelectors';
import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';
import { QueueActions } from 'src/shared/resources/queue/queueSlice';
import { getCurrentTaskDataElementId, getDataTypeByLayoutSetId, isStatelessApp } from 'src/utils/appMetadata';
import { convertModelToDataBinding } from 'src/utils/databindings';
import { putWithoutConfig } from 'src/utils/network/networking';
import { waitFor } from 'src/utils/sagas';
import { get } from 'src/utils/sharedUtils';
import {
  getFetchFormDataUrl,
  getStatelessFormDataUrl,
  invalidateCookieUrl,
  redirectToUpgrade,
} from 'src/utils/urls/appUrlHelper';
import type { IApplicationMetadata } from 'src/shared/resources/applicationMetadata';
import type { IProcessState } from 'src/shared/resources/process';
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
      const fetchedData: any = yield call(get, getFetchFormDataUrl(instance.id, currentTaskDataElementId));
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
        fetchedData = yield call(get, getFetchFormDataUrl(instance.id, currentTaskDataId));
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
    return yield call(get, getStatelessFormDataUrl(dataType, allowAnonymous), options);
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
