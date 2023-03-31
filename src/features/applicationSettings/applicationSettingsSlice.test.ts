import {
  ApplicationSettingsActions,
  applicationSettingsSlice,
  initialState,
} from 'src/features/applicationSettings/applicationSettingsSlice';
import type { IApplicationSettingsState } from 'src/features/applicationSettings/applicationSettingsSlice';
import type {
  IFetchApplicationSettingsFulfilled,
  IFetchApplicationSettingsRejected,
} from 'src/features/applicationSettings/applicationSettingsTypes';

describe('applicationSettingsSlice', () => {
  const slice = applicationSettingsSlice();
  let state: IApplicationSettingsState;
  beforeAll(() => {
    state = initialState;
  });

  it('handles fetchApplicationSettingsFulfilled', () => {
    const mockSettings: IFetchApplicationSettingsFulfilled = {
      settings: { appOidcProvider: 'test' },
    };
    const nextState = slice.reducer(state, ApplicationSettingsActions.fetchApplicationSettingsFulfilled(mockSettings));
    expect(nextState.applicationSettings).toEqual(mockSettings.settings);
  });

  it('handles fetchApplicationSettingsRejected', () => {
    const mockError: IFetchApplicationSettingsRejected = {
      error: new Error('mock'),
    };
    const nextState = slice.reducer(state, ApplicationSettingsActions.fetchApplicationSettingsRejected(mockError));
    expect(nextState.error).toEqual(mockError.error);
  });
});
