import { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../../utils/networking';
import { applicationSettingsApiUrl } from '../../../../../utils/urlHelper';
import ApplicationSettingsActions from '../../actions';
import { FETCH_APPLICATION_SETTINGS } from '../../actions/types';
import { appTaskQueueError } from '../../../queue/queueSlice';

function* getApplicationSettings(): SagaIterator {
  try {
    const applicationSettings = yield call(get, applicationSettingsApiUrl);
    yield call(ApplicationSettingsActions.getApplicationSettingsFulfilled, applicationSettings);
  } catch (error) {
    yield call(ApplicationSettingsActions.getApplicationSettingsRejected, error);
    yield put(appTaskQueueError({ error }));
  }
}

export function* watchGetApplicationSettingsSaga(): SagaIterator {
  yield takeLatest(FETCH_APPLICATION_SETTINGS, getApplicationSettings);
}
