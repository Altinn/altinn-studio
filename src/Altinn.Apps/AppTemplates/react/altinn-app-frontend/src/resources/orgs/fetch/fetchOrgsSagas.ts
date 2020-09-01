import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get } from '../../../utils/networking';
import OrgsActions from '../orgsActions';
import * as OrgsActionTypes from './fetchOrgsActionTypes';

import {
  orgsListUrl,
} from 'altinn-shared/utils';

export function* fetchOrgsSaga(): SagaIterator {
  try {
    const result: any = yield call(get, orgsListUrl);
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
