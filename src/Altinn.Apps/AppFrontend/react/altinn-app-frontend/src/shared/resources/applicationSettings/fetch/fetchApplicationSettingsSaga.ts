import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../utils/networking';
import { applicationSettingsApiUrl } from '../../../../utils/urlHelper';
import { ApplicationSettingsActions as Actions } from '../applicationSettingsSlice';

function* getApplicationSettings(): SagaIterator {
  try {
    const applicationSettings = yield call(get, applicationSettingsApiUrl);
    yield call(Actions.fetchApplicationSettingsFulfilled, applicationSettings);
  } catch (error) {
    yield call(Actions.fetchApplicationSettingsRejected, error);
  }
}

export function* watchGetApplicationSettingsSaga(): SagaIterator {
  yield takeLatest(Actions.fetchApplicationSettings, getApplicationSettings);
}
