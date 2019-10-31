import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../shared/src/utils/networking';
import * as FetchDashboardActions from './fetchDashboardActions';
import * as FetchDashboardActionTypes from './fetchDashboardActionTypes';
import FetchDashboardDispatchers from './fetchDashboardDispatcher';

export function* fetchServicesSaga({
  url,
}: FetchDashboardActions.IFetchServicesAction): SagaIterator {
  try {
    const services = yield call(get, url);
    yield call(FetchDashboardDispatchers.fetchServicesFulfilled, services);
  } catch (err) {
    yield call(FetchDashboardDispatchers.fetchServicesRejected, err);
  }
}

export function* fetchCurrentUserSaga({
  url,
}: FetchDashboardActions.IFetchCurrentUserAction): SagaIterator {
  try {
    const user = yield call(get, url);
    yield call(FetchDashboardDispatchers.fetchCurrentUserFulfilled, user);
  } catch (err) {
    yield call(FetchDashboardDispatchers.fetchCurrentUserRejected, err);
  }
}

export function* fetchOrganisationsSaga({
  url,
}: FetchDashboardActions.IFetchOrganisationsAction): SagaIterator {
  try {
    const user = yield call(get, url);
    yield call(FetchDashboardDispatchers.fetchOrganisationsFulfilled, user);
  } catch (err) {
    yield call(FetchDashboardDispatchers.fetchOrganisationsRejected, err);
  }
}

export function* watchFetchServicesSaga(): SagaIterator {
  yield takeLatest(
    FetchDashboardActionTypes.FETCH_SERVICES,
    fetchServicesSaga,
  );
}

export function* watchFetchCurrentUserSaga(): SagaIterator {
  yield takeLatest(
    FetchDashboardActionTypes.FETCH_CURRENT_USER,
    fetchCurrentUserSaga,
  );
}

export function* watchFetchOrganisationsSaga(): SagaIterator {
  yield takeLatest(
    FetchDashboardActionTypes.FETCH_ORGANISATIONS,
    fetchOrganisationsSaga,
  );
}

// tslint:disable-next-line:space-before-function-paren
export default function* (): SagaIterator {
  yield fork(watchFetchServicesSaga);
  yield fork(watchFetchCurrentUserSaga);
  yield fork(watchFetchOrganisationsSaga);
}
