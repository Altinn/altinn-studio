import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get } from 'app-shared/utils/networking';
import * as ConfigurationActionTypes from '../configurationActionTypes';
import ConfigurationDispatcher from '../configurationDispatcher';
import { getOrgsListUrl } from '../../../utils/urlHelper';

function* getOrgsSaga(): SagaIterator {
  try {
    const result: any = yield call(get, getOrgsListUrl);
    const orgObject = result.orgs;
    yield call(ConfigurationDispatcher.getOrgsFulfilled, orgObject);
  } catch (err) {
    yield call(ConfigurationDispatcher.getOrgsRejected, err);
  }
}

export default function* watchGetOrgsSaga(): SagaIterator {
  yield takeLatest(
    ConfigurationActionTypes.GET_ORGS,
    getOrgsSaga,
  );
}
