import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get, post } from '../../../../shared/src/utils/networking';
import postMessages from '../../../../shared/src/utils/postMessages';
import * as HandleServiceInformationActions from './handleServiceInformationActions';
import * as HandleServiceInformationActionTypes from './handleServiceInformationActionTypes';
import HandleServiceInformationDispatcher from './handleServiceInformationDispatcher';

export function* handleFetchServiceSaga({
  url,
}: HandleServiceInformationActions.IFetchServiceAction): SagaIterator {
  try {
    const result = yield call(get, url);

    yield call(HandleServiceInformationDispatcher.fetchServiceFulfilled, result);
  } catch (err) {
    yield call(HandleServiceInformationDispatcher.fetchServiceRejected, err);
  }
}

export function* watchHandleFetchServiceSaga(): SagaIterator {
  yield takeLatest(
    HandleServiceInformationActionTypes.FETCH_SERVICE,
    handleFetchServiceSaga,
  );
}

export function* handleFetchServiceNameSaga({
  url,
}: HandleServiceInformationActions.IFetchServiceNameAction): SagaIterator {
  try {
    const serviceName = yield call(get, url);

    yield call(HandleServiceInformationDispatcher.fetchServiceNameFulfilled, serviceName || '');
  } catch (err) {
    yield call(HandleServiceInformationDispatcher.fetchServiceNameRejected, err);
  }
}

export function* watchHandleFetchServiceNameSaga(): SagaIterator {
  yield takeLatest(
    HandleServiceInformationActionTypes.FETCH_SERVICE_NAME,
    handleFetchServiceNameSaga,
  );
}

export function* handleSaveServiceNameSaga({
  url, newServiceName,
}: HandleServiceInformationActions.ISaveServiceNameAction): SagaIterator {
  try {
    yield call(post, url, { serviceName: newServiceName });
    yield call(HandleServiceInformationDispatcher.saveServiceNameFulfilled, newServiceName);
  } catch (err) {
    yield call(HandleServiceInformationDispatcher.saveServiceNameRejected, err);
  }
}

export function* watchHandleSaveServiceNameSaga(): SagaIterator {
  yield takeLatest(
    HandleServiceInformationActionTypes.SAVE_SERVICE_NAME,
    handleSaveServiceNameSaga,
  );
}

export function* handleFetchInitialCommitSaga({
  url,
}: HandleServiceInformationActions.IFetchInitialCommitAction): SagaIterator {
  try {
    const result = yield call(get, url);

    yield call(HandleServiceInformationDispatcher.fetchInitialCommitFulfilled, result);
  } catch (err) {
    yield call(HandleServiceInformationDispatcher.fetchInitialCommitRejected, err);
  }
}

export function* watchHandleFetchInitialCommitSaga(): SagaIterator {
  yield takeLatest(
    HandleServiceInformationActionTypes.FETCH_INITIAL_COMMIT,
    handleFetchInitialCommitSaga,
  );
}

export function* handleFetchServiceConfigSaga({
  url,
}: HandleServiceInformationActions.IFetchServiceConfigAction): SagaIterator {
  try {
    const serviceConfig = yield call(get, url);

    yield call(HandleServiceInformationDispatcher.fetchServiceConfigFulfilled, serviceConfig || {});
  } catch (err) {
    yield call(HandleServiceInformationDispatcher.fetchInitialCommitRejected, err);
  }
}

export function* watchHandleFetchServiceConfigSaga(): SagaIterator {
  yield takeLatest(
    HandleServiceInformationActionTypes.FETCH_SERVICE_CONFIG,
    handleFetchServiceConfigSaga,
  );
}

export function* handleSaveServiceConfigSaga({
  url, newServiceDescription, newServiceId,
}: HandleServiceInformationActions.ISaveServiceConfigAction): SagaIterator {
  try {
    yield call(post, url, { serviceDescription: newServiceDescription, serviceId: newServiceId });
    yield call(HandleServiceInformationDispatcher.saveServiceConfigFulfilled, newServiceDescription, newServiceId);
    window.postMessage(postMessages.filesAreSaved, window.location.href);
  } catch (err) {
    yield call(HandleServiceInformationDispatcher.saveServiceConfigRejected, err);
  }
}

export function* watchHandleSaveServiceConfigSaga(): SagaIterator {
  yield takeLatest(
    HandleServiceInformationActionTypes.SAVE_SERVICE_CONFIG,
    handleSaveServiceConfigSaga,
  );
}
