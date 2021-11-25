import { PayloadAction } from '@reduxjs/toolkit';
import { SagaIterator } from 'redux-saga';
import { call, fork, put, takeLatest } from 'redux-saga/effects';
import { IRepository } from 'app-shared/types';
import { get } from 'app-shared/utils/networking';
import { dataModellingSagas } from 'app-shared/features/dataModelling/sagas';
import { DashboardActions, IFetchDashboardInfoAction } from './dashboardSlice';

export function* fetchServicesSaga({
  payload: { url },
}: PayloadAction<IFetchDashboardInfoAction>): SagaIterator {
  try {
    const services: IRepository[] = yield call(get, url);
    const filteredServices = services.filter(
      (service) => service.name !== 'datamodels',
    );
    yield put(
      DashboardActions.fetchServicesFulfilled({ info: filteredServices }),
    );
  } catch (error) {
    yield put(DashboardActions.fetchServicesFulfilled);
  }
}

export function* fetchCurrentUserSaga({
  payload: { url },
}: PayloadAction<IFetchDashboardInfoAction>): SagaIterator {
  try {
    const user = yield call(get, url);
    yield put(DashboardActions.fetchCurrentUserFulfilled({ info: user }));
  } catch (error) {
    yield put(DashboardActions.fetchCurrentUserRejected({ error }));
  }
}

export function* watchFetchServicesSaga(): SagaIterator {
  yield takeLatest(DashboardActions.fetchServices, fetchServicesSaga);
}

export function* watchFetchCurrentUserSaga(): SagaIterator {
  yield takeLatest(DashboardActions.fetchCurrentUser, fetchCurrentUserSaga);
}

// eslint-disable-next-line func-names
export default function* (): SagaIterator {
  yield fork(watchFetchServicesSaga);
  yield fork(watchFetchCurrentUserSaga);
  yield fork(dataModellingSagas);
}
