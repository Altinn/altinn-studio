import type { SagaIterator } from 'redux-saga';
import { call, select, takeLatest, all, take, put } from 'redux-saga/effects';
import { get } from 'altinn-shared/utils';
import type { IInstance } from 'altinn-shared/types';
import {
  getCurrentTaskDataElementId,
  getDataTypeByLayoutSetId,
  isStatelessApp,
} from 'src/utils/appMetadata';
import { putWithoutConfig } from 'src/utils/networking';
import { convertModelToDataBinding } from '../../../../utils/databindings';
import { FormDataActions } from '../formDataSlice';
import type { ILayoutSets, IRuntimeState } from '../../../../types';
import type { IApplicationMetadata } from '../../../../shared/resources/applicationMetadata';
import { FormDynamicsActions } from '../../dynamics/formDynamicsSlice';
import { dataTaskQueueError } from '../../../../shared/resources/queue/queueSlice';
import type { IProcessState } from '../../../../shared/resources/process';
import {
  getFetchFormDataUrl,
  getStatelessFormDataUrl,
  invalidateCookieUrl,
  redirectToUpgrade,
} from '../../../../utils/appUrlHelper';
import { DataModelActions } from '../../datamodel/datamodelSlice';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import {
  appMetaDataSelector,
  instanceDataSelector,
  processStateSelector,
  currentSelectedPartyIdSelector,
  layoutSetsSelector,
} from 'src/selectors/simpleSelectors';
import { FormRulesActions } from 'src/features/form/rules/rulesSlice';
import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';

export const allowAnonymousSelector = makeGetAllowAnonymousSelector();

export function* fetchFormDataSaga(): SagaIterator {
  try {
    // This is a temporary solution for the "one task - one datamodel - process"
    const applicationMetadata: IApplicationMetadata = yield select(
      appMetaDataSelector,
    );
    const instance: IInstance = yield select(instanceDataSelector);
    const currentTaskDataElementId = getCurrentTaskDataElementId(
      applicationMetadata,
      instance,
    );
    const fetchedData: any = yield call(
      get,
      getFetchFormDataUrl(instance.id, currentTaskDataElementId),
    );
    const formData = convertModelToDataBinding(fetchedData);
    yield put(FormDataActions.fetchFulfilled({ formData }));
  } catch (error) {
    yield put(FormDataActions.fetchRejected({ error }));
  }
}

export function* watchFormDataSaga(): SagaIterator {
  yield takeLatest(FormDataActions.fetch, fetchFormDataSaga);
}

export function* fetchFormDataInitialSaga(): SagaIterator {
  try {
    // This is a temporary solution for the "one task - one datamodel - process"
    const applicationMetadata: IApplicationMetadata = yield select(
      appMetaDataSelector,
    );
    let fetchedData: any;

    if (isStatelessApp(applicationMetadata)) {
      // stateless app
      fetchedData = yield call(fetchFormDataStateless, applicationMetadata);
    } else {
      // app with instance
      const instance: IInstance = yield select(instanceDataSelector);
      const currentTaskDataId = getCurrentTaskDataElementId(
        applicationMetadata,
        instance,
      );
      fetchedData = yield call(
        get,
        getFetchFormDataUrl(instance.id, currentTaskDataId),
      );
    }

    const formData = convertModelToDataBinding(fetchedData);
    yield put(FormDataActions.fetchFulfilled({ formData }));
    yield put(FormRulesActions.fetch());
    yield put(FormDynamicsActions.fetch());
  } catch (error) {
    yield put(FormDataActions.fetchRejected({ error }));
    yield put(dataTaskQueueError({ error }));
  }
}

function* fetchFormDataStateless(applicationMetadata: IApplicationMetadata) {
  const layoutSets: ILayoutSets = yield select(layoutSetsSelector);
  const dataType = getDataTypeByLayoutSetId(
    applicationMetadata.onEntry.show,
    layoutSets,
  );

  const allowAnonymous = yield select(allowAnonymousSelector);

  let options = {};

  if (!allowAnonymous) {
    const selectedPartyId = yield select(currentSelectedPartyIdSelector);
    options = {
      headers: {
        party: `partyid:${selectedPartyId}`,
      },
    };
  }

  try {
    return yield call(
      get,
      getStatelessFormDataUrl(dataType, allowAnonymous),
      options,
    );
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

function* waitFor(selector) {
  if (yield select(selector)) {
    return;
  }
  while (true) {
    yield take('*');
    if (yield select(selector)) {
      return;
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
      const allowAnonymous = yield select(allowAnonymousSelector);
      if (!allowAnonymous) {
        call(
          waitFor,
          (state: IRuntimeState) =>
            currentSelectedPartyIdSelector(state) !== undefined,
        );
      }
    } else if (
      !processState ||
      !instance ||
      processState.taskId !== instance.process.currentTask.elementId
    ) {
      yield all([
        take(InstanceDataActions.getFulfilled),
        take(DataModelActions.fetchJsonSchemaFulfilled),
      ]);
    }
    yield call(fetchFormDataInitialSaga);
  }
}
