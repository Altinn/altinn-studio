import { expectSaga } from "redux-saga-test-plan";
import { getApplicationSettings, watchGetApplicationSettingsSaga } from '../../../../../src/shared/resources/applicationSettings/fetch/fetchApplicationSettingsSaga';
import { ApplicationSettingsActions } from '../../../../../src/shared/resources/applicationSettings/applicationSettingsSlice';
import { applicationSettingsApiUrl } from "../../../../../src/utils/urlHelper";
import * as networking from "../../../../../src/utils/networking";

describe('resources > applicationSettings > fetch > fetchApplicationSettingsSagas', () => {
  it('fetchApplicationSettingsSagas should set state with result if get is successful ', () => {
    const mockResponse = { appOidcProvider: 'something'};
    jest.spyOn(networking, 'get').mockResolvedValue(mockResponse);
    return expectSaga(getApplicationSettings)
      .call(networking.get, applicationSettingsApiUrl)
      .put(ApplicationSettingsActions.fetchApplicationSettingsFulfilled({ settings: mockResponse }))
      .run();
  });

  it('fetchApplicationSettingsSagas should set state with error if get fails', () => {
    const mockError = { message: 'some error'};
    jest.spyOn(networking, 'get').mockRejectedValue(mockError);
    return expectSaga(getApplicationSettings)
      .call(networking.get, applicationSettingsApiUrl)
      .call(ApplicationSettingsActions.fetchApplicationSettingsRejected, mockError)
      .run();
  });
});
