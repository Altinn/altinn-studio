import { expectSaga } from 'redux-saga-test-plan';

import { getApplicationSettings } from './fetchApplicationSettingsSaga';
import { ApplicationSettingsActions } from '../applicationSettingsSlice';
import { applicationSettingsApiUrl } from '../../../../utils/appUrlHelper';
import * as networking from '../../../../utils/networking';

describe('fetchApplicationSettingsSaga', () => {
  it('should set state with result if get is successful ', () => {
    const mockResponse = { appOidcProvider: 'something' };
    jest.spyOn(networking, 'get').mockResolvedValue(mockResponse);
    return expectSaga(getApplicationSettings)
      .call(networking.get, applicationSettingsApiUrl)
      .put(
        ApplicationSettingsActions.fetchApplicationSettingsFulfilled({
          settings: mockResponse,
        }),
      )
      .run();
  });

  it('should set state with error if get fails', () => {
    const mockError = new Error('failed with 404');
    jest.spyOn(networking, 'get').mockRejectedValue(mockError);
    return expectSaga(getApplicationSettings)
      .call(networking.get, applicationSettingsApiUrl)
      .put(
        ApplicationSettingsActions.fetchApplicationSettingsRejected({
          error: mockError,
        }),
      )
      .run();
  });
});
