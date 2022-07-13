import type {
  IFetchApplicationSettingsFulfilled,
  IFetchApplicationSettingsRejected,
} from './applicationSettingsTypes';

import type { IApplicationSettingsState } from './applicationSettingsSlice';
import slice, {
  initialState,
  ApplicationSettingsActions,
} from './applicationSettingsSlice';

describe('applicationSettingsSlice', () => {
  let state: IApplicationSettingsState;
  beforeAll(() => {
    state = initialState;
  });

  it('handles fetchApplicationSettingsFulfilled', () => {
    const mockSettings: IFetchApplicationSettingsFulfilled = {
      settings: { appOidcProvider: 'test' },
    };
    const nextState = slice.reducer(
      state,
      ApplicationSettingsActions.fetchApplicationSettingsFulfilled(
        mockSettings,
      ),
    );
    expect(nextState.applicationSettings).toEqual(mockSettings.settings);
  });

  it('handles fetchApplicationSettingsRejected', () => {
    const mockError: IFetchApplicationSettingsRejected = {
      error: new Error('mock'),
    };
    const nextState = slice.reducer(
      state,
      ApplicationSettingsActions.fetchApplicationSettingsRejected(mockError),
    );
    expect(nextState.error).toEqual(mockError.error);
  });
});
