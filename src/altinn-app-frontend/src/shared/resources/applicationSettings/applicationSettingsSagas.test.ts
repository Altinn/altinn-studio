import { expectSaga } from 'redux-saga-test-plan';

import applicationSettingsSagas from './applicationSettingsSagas';
import { watchGetApplicationSettingsSaga } from './fetch/fetchApplicationSettingsSaga';

describe('applicationSettingsSagas', () => {
  it('should fork watchGetApplicationSettingsSaga', () => {
    return expectSaga(applicationSettingsSagas)
      .fork(watchGetApplicationSettingsSaga)
      .run();
  });
});
