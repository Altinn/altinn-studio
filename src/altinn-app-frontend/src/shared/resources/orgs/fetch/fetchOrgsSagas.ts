import type { SagaIterator } from 'redux-saga';
import { call, put } from 'redux-saga/effects';
import { orgsListUrl } from 'altinn-shared/utils';
import axios from 'axios';
import { OrgsActions } from 'src/shared/resources/orgs/orgsSlice';

export function* fetchOrgsSaga(): SagaIterator {
  try {
    const result: any = yield call(axios.get, orgsListUrl, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const orgObject = result.data?.orgs;
    yield put(OrgsActions.fetchFulfilled({ orgs: orgObject }));
  } catch (error) {
    yield put(OrgsActions.fetchRejected({ error }));
  }
}
