import { SagaIterator } from 'redux-saga';
import { call, takeLatest, fork } from 'redux-saga/effects';
import { get } from '../../../shared/src/utils/networking';
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

export function* fetchOrganizationsSaga({
  url,
}: FetchDashboardActions.IFetchOrganizationsAction): SagaIterator {
  try {
    const organization = yield call(get, url);
    yield call(FetchDashboardDispatchers.fetchOrganizationsFulfilled, organization);
  } catch (err) {
    yield call(FetchDashboardDispatchers.fetchOrganizationsRejected, err);
  }
}

export function* watchFetchServicesSaga(): SagaIterator {
  yield takeLatest(
    FetchDashboardActionTypes.FETCH_SERVICES,
    fetchServicesSaga,
  );
}

export function* watchFetchOrganizationsSaga(): SagaIterator {
  yield takeLatest(
    FetchDashboardActionTypes.FETCH_ORGANIZATIONS,
    fetchOrganizationsSaga,
  );
}

export default function* (): SagaIterator {
  yield fork(watchFetchServicesSaga);
  yield fork(watchFetchOrganizationsSaga)
}
