import reducer, { IApplicationSettingsState, initialState, ApplicationSettingsActions } from '../../../../src/shared/resources/applicationSettings/applicationSettingsSlice';
import { IFetchApplicationSettingsFulfilled, IFetchApplicationSettingsRejected } from '../../../../src/shared/resources/applicationSettings/applicationSettingsTypes';

describe('resources > applicationSettings > applicationSettingsSlice', () => {
  let state: IApplicationSettingsState;
  beforeAll(() => {
    state = initialState;
  });

  it('handles fetchApplicationSettingsFulfilled', () => {
    const mockSettings: IFetchApplicationSettingsFulfilled = { settings: { appOidcProvider: 'test' }}
    const nextState = reducer(state, ApplicationSettingsActions.fetchApplicationSettingsFulfilled(mockSettings));
    expect(nextState.applicationSettings).toEqual(mockSettings.settings);
  });

  it('handles fetchApplicationSettingsRejected', () => {
    const mockError: IFetchApplicationSettingsRejected = { error: new Error("mock")}
    const nextState = reducer(state, ApplicationSettingsActions.fetchApplicationSettingsRejected(mockError));
    expect(nextState.error).toEqual(mockError.error);
  });
});
