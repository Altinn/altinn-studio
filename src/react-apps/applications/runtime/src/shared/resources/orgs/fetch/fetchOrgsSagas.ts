import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../utils/networking';
import OrgsActions from './../orgsActions';
import { IFetchOrgs } from './fetchOrgsActions';
import * as OrgsActionTypes from './fetchOrgsActionTypes';

import {
  orgsListUrl,
} from './../../../../../../shared/src/utils/urlHelper';

export function* fetchOrgsSaga(): SagaIterator {
  try {
    console.log('action!');
    const result = yield call(get, orgsListUrl);
    console.log('result', result);
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
