import { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import { fetchDeployPermissionsUrl } from '../../../utils/urlHelper';
import { get } from '../../../utils/networking';
import { fetchDeployPermissions, fetchDeployPermissionsFulfilled, fetchDeployPermissionsRejected } from '../userSlice';

export function* fetchDeployPermissionsSaga(): SagaIterator {
  try {
    const result = yield call(get, fetchDeployPermissionsUrl);
    yield put(fetchDeployPermissionsFulfilled({ environments: result }));
  } catch (error) {
    yield put(fetchDeployPermissionsRejected({ error }));
  }
}

export function* watchFetchDeployPermissionsSaga(): SagaIterator {
  yield takeLatest(fetchDeployPermissions, fetchDeployPermissionsSaga);
}
