import type { SagaIterator } from 'redux-saga';
import { call, put } from 'redux-saga/effects';
import { get } from '../../../../utils/networking';
import { applicationSettingsApiUrl } from '../../../../utils/appUrlHelper';
import { ApplicationSettingsActions as Actions } from '../applicationSettingsSlice';

export function* getApplicationSettings(): SagaIterator {
  try {
    const applicationSettings = yield call(get, applicationSettingsApiUrl);
    yield put(
      Actions.fetchApplicationSettingsFulfilled({
        settings: applicationSettings,
      }),
    );
  } catch (error) {
    yield put(Actions.fetchApplicationSettingsRejected({ error }));
  }
}
