import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../../utils/networking';
import { applicationSettingsApiUrl } from '../../../../../utils/urlHelper';
import ApplicationSettingsActions from '../../actions';
import { FETCH_APPLICATION_SETTINGS } from '../../actions/types';

function* getApplicationSettings(): SagaIterator {
  try {
    // const applicationSettings = yield call(get, applicationSettingsApiUrl);
    console.log('applicaitonSettings');
    //yield call(ApplicationSettingsActions.getApplicationSettingsFulfilled, applicationSettings);
  } catch (error) {
    console.error(error);
    // yield call(ApplicationSettingsActions.getApplicationSettingsRejected, error);
    // yield put(appTaskQueueError({ error }));
  }
}

export function* watchGetApplicationSettingsSaga(): SagaIterator {
  yield takeLatest(FETCH_APPLICATION_SETTINGS, getApplicationSettings);
}
