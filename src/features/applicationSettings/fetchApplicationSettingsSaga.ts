import { call, put } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { ApplicationSettingsActions } from 'src/features/applicationSettings/applicationSettingsSlice';
import { httpGet } from 'src/utils/network/networking';
import { applicationSettingsApiUrl } from 'src/utils/urls/appUrlHelper';

export function* getApplicationSettings(): SagaIterator {
  try {
    const applicationSettings = yield call(httpGet, applicationSettingsApiUrl);
    yield put(
      ApplicationSettingsActions.fetchApplicationSettingsFulfilled({
        settings: applicationSettings,
      }),
    );
  } catch (error) {
    yield put(ApplicationSettingsActions.fetchApplicationSettingsRejected({ error }));
  }
}
