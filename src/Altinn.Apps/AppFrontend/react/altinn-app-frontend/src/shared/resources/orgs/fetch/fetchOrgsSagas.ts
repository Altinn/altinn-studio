import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { orgsListUrl } from 'altinn-shared/utils';
import { get } from '../../../../utils/networking';
import OrgsActions from '../orgsActions';
import * as OrgsActionTypes from './fetchOrgsActionTypes';

export function* fetchOrgsSaga(): SagaIterator {
  try {
    const result: any = yield call(get, orgsListUrl, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const orgObject = result.orgs;
    yield call(OrgsActions.fetchOrgsFulfilled, orgObject);
  } catch (err) {
    yield call(OrgsActions.fetchOrgsRejected, err);
  }
}

export function* watchFetchOrgsSaga(): SagaIterator {
  yield takeLatest(
    OrgsActionTypes.FETCH_ORGS,
    fetchOrgsSaga,
  );
}
