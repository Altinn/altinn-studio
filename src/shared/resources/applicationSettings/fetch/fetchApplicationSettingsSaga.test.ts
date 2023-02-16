import { expectSaga } from 'redux-saga-test-plan';

import { ApplicationSettingsActions } from 'src/shared/resources/applicationSettings/applicationSettingsSlice';
import { getApplicationSettings } from 'src/shared/resources/applicationSettings/fetch/fetchApplicationSettingsSaga';
import * as networking from 'src/utils/network/networking';
import { applicationSettingsApiUrl } from 'src/utils/urls/appUrlHelper';

describe('fetchApplicationSettingsSaga', () => {
  it('should set state with result if get is successful ', () => {
    const mockResponse = { appOidcProvider: 'something' };
    jest.spyOn(networking, 'httpGet').mockResolvedValue(mockResponse);
    return expectSaga(getApplicationSettings)
      .call(networking.httpGet, applicationSettingsApiUrl)
      .put(
        ApplicationSettingsActions.fetchApplicationSettingsFulfilled({
          settings: mockResponse,
        }),
      )
      .run();
  });

  it('should set state with error if get fails', () => {
    const mockError = new Error('failed with 404');
    jest.spyOn(networking, 'httpGet').mockRejectedValue(mockError);
    return expectSaga(getApplicationSettings)
      .call(networking.httpGet, applicationSettingsApiUrl)
      .put(
        ApplicationSettingsActions.fetchApplicationSettingsRejected({
          error: mockError,
        }),
      )
      .run();
  });
});
