import { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import { get, post } from 'app-shared/utils/networking';
import postMessages from 'app-shared/utils/postMessages';
import { PayloadAction } from '@reduxjs/toolkit';
import { HandleServiceInformationActions } from './handleServiceInformationSlice';
import { IFetchInitialCommitAction, IFetchServiceAction, IFetchServiceConfigAction, IFetchServiceNameAction, ISaveServiceConfigAction, ISaveServiceNameAction } from './types';

export function* handleFetchServiceSaga({ payload: {
  url,
} }: PayloadAction<IFetchServiceAction>): SagaIterator {
  try {
    const result = yield call(get, url);

    yield put(HandleServiceInformationActions.fetchServiceFulfilled({ repository: result }));
  } catch (error) {
    yield put(HandleServiceInformationActions.fetchServiceRejected({ error }));
  }
}

export function* watchHandleFetchServiceSaga(): SagaIterator {
  yield takeLatest(HandleServiceInformationActions.fetchService, handleFetchServiceSaga);
}

export function* handleFetchServiceNameSaga({ payload: {
  url,
} }: PayloadAction<IFetchServiceNameAction>): SagaIterator {
  try {
    const serviceName = yield call(get, url);

    yield put(HandleServiceInformationActions.fetchServiceNameFulfilled({ serviceName: serviceName || '' }));
  } catch (error) {
    yield put(HandleServiceInformationActions.fetchServiceNameRejected({ error }));
  }
}

export function* watchHandleFetchServiceNameSaga(): SagaIterator {
  yield takeLatest(HandleServiceInformationActions.fetchServiceName, handleFetchServiceNameSaga);
}

export function* handleSaveServiceNameSaga({ payload: {
  url, newServiceName,
} }: PayloadAction<ISaveServiceNameAction>): SagaIterator {
  try {
    yield call(post, url, { serviceName: newServiceName });
    yield put(HandleServiceInformationActions.saveServiceNameFulfilled({ newServiceName }));
  } catch (error) {
    yield put(HandleServiceInformationActions.saveServiceNameRejected({ error }));
  }
}

export function* watchHandleSaveServiceNameSaga(): SagaIterator {
  yield takeLatest(HandleServiceInformationActions.saveServiceName, handleSaveServiceNameSaga);
}

export function* handleFetchInitialCommitSaga({ payload: {
  url,
} }: PayloadAction<IFetchInitialCommitAction>): SagaIterator {
  try {
    const result = yield call(get, url);

    yield put(HandleServiceInformationActions.fetchInitialCommitFulfilled({ result }));
  } catch (error) {
    yield put(HandleServiceInformationActions.fetchInitialCommitRejected({ error }));
  }
}

export function* watchHandleFetchInitialCommitSaga(): SagaIterator {
  yield takeLatest(HandleServiceInformationActions.fetchInitialCommit, handleFetchInitialCommitSaga);
}

export function* handleFetchServiceConfigSaga({ payload: {
  url,
} }: PayloadAction<IFetchServiceConfigAction>): SagaIterator {
  try {
    const serviceConfig = yield call(get, url);

    yield put(HandleServiceInformationActions.fetchServiceConfigFulfilled({ serviceConfig: serviceConfig || null }));
  } catch (error) {
    yield put(HandleServiceInformationActions.fetchInitialCommitRejected({ error }));
  }
}

export function* watchHandleFetchServiceConfigSaga(): SagaIterator {
  yield takeLatest(HandleServiceInformationActions.fetchServiceConfig, handleFetchServiceConfigSaga);
}

export function* handleSaveServiceConfigSaga({ payload: {
  url, newServiceDescription, newServiceId, newServiceName,
} }: PayloadAction<ISaveServiceConfigAction>): SagaIterator {
  try {
    yield call(post, url,
      {
        serviceDescription: newServiceDescription,
        serviceId: newServiceId,
        serviceName: newServiceName,
      });
    yield put(HandleServiceInformationActions.saveServiceConfigFulfilled({
      newServiceDescription,
      newServiceId,
      newServiceName,
    }));
    window.postMessage(postMessages.filesAreSaved, window.location.href);
  } catch (error) {
    yield put(HandleServiceInformationActions.saveServiceConfigRejected({ error }));
  }
}

export function* watchHandleSaveServiceConfigSaga(): SagaIterator {
  yield takeLatest(HandleServiceInformationActions.saveServiceConfig, handleSaveServiceConfigSaga);
}
