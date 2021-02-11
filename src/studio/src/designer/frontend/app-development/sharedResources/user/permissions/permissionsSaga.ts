import { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import { getFetchDeployPermissionsUrl } from '../../../utils/urlHelper';
import { get } from '../../../utils/networking';
import { fetchDeployPermissions, fetchDeployPermissionsFulfilled, fetchDeployPermissionsRejected } from '../userSlice';

export function* fetchDeployPermissionsSaga(): SagaIterator {
  try {
    const url = getFetchDeployPermissionsUrl();
    const result = yield call(get, url);
    yield put(fetchDeployPermissionsFulfilled({ environments: result }));
  } catch (error) {
    yield put(fetchDeployPermissionsRejected({ error }));
  }
}

export function* watchFetchDeployPermissionsSaga(): SagaIterator {
  yield takeLatest(fetchDeployPermissions, fetchDeployPermissionsSaga);
}
