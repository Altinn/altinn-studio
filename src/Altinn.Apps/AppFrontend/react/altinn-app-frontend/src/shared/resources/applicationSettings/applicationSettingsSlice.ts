import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IApplicationSettings } from '../../../types';
import * as ApplicationSettingsTypes from './applicationSettingsTypes';

export interface IApplicationSettingsState {
  applicationSettings: IApplicationSettings;
  error: Error;
}

export const initialState: IApplicationSettingsState = {
  applicationSettings: null,
  error: null,
};

const moduleName = 'applicationSettings';

const applicationSettingsSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    fetchApplicationSettingsFulfilled:
    (state, action: PayloadAction<ApplicationSettingsTypes.IFetchApplicationSettingsFulfilled>) => {
      const { settings } = action.payload;
      state.applicationSettings = settings;
    },
    fetchApplicationSettingsRejected:
    (state, action: PayloadAction<ApplicationSettingsTypes.IApplicationSettingsActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
  },
});

const actions = {
  fetchApplicationSettings: createAction(`${moduleName}/fetchApplicationSettings`),
};

export const ApplicationSettingsActions = {
  ...actions,
  ...applicationSettingsSlice.actions,
};
export default applicationSettingsSlice.reducer;
