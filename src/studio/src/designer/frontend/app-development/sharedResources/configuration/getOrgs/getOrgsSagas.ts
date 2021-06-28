import { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import { get } from 'app-shared/utils/networking';
import { ConfigurationActions } from '../configurationSlice';
import { orgsListUrl } from '../../../utils/urlHelper';

function* getOrgsSaga(): SagaIterator {
  try {
    const result: any = yield call(get, orgsListUrl);
    const orgObject = result.orgs;
    yield put(ConfigurationActions.getOrgsFulfilled({ orgs: orgObject }));
  } catch (error) {
    yield put(ConfigurationActions.getOrgsRejected({ error }));
  }
}

export default function* watchGetOrgsSaga(): SagaIterator {
  yield takeLatest(ConfigurationActions.getOrgs, getOrgsSaga);
}
