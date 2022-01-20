import { expectSaga } from "redux-saga-test-plan";
import applicationSettingsSagas from '../../../../src/shared/resources/applicationSettings/applicationSettingsSagas';
import { watchGetApplicationSettingsSaga } from "../../../../src/shared/resources/applicationSettings/fetch/fetchApplicationSettingsSaga";

describe('resources > applicationSettings > applicationSettingsSagas', () => {
  it('applicationSettingsSagas should fork watchGetApplicationSettingsSaga', () => {
    return expectSaga(applicationSettingsSagas)
      .fork(watchGetApplicationSettingsSaga)
      .run();
  });
});
