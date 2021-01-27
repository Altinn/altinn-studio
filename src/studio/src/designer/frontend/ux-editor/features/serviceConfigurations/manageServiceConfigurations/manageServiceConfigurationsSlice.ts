/* eslint-disable no-param-reassign */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IManageServiceConfigurationState {
  fetching: boolean;
  fetched: boolean;
  error: Error;
  saving: boolean;
  saved: boolean;
}

const initialState: IManageServiceConfigurationState = {
  fetching: false,
  fetched: false,
  error: null,
  saving: false,
  saved: false,
};

const manageServiceConfigurationsSlice = createSlice({
  name: 'manageServiceConfigurations',
  initialState,
  reducers: {
    fetchServiceConfiguration: (state) => {
      state.fetching = true;
    },
    fetchServiceConfigurationFulfilled: (state) => {
      state.fetched = true;
      state.fetching = false;
      state.error = null;
    },
    fetchServiceConfigurationRejected: (state, action: PayloadAction<IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
      state.fetched = false;
      state.fetching = false;
    },
    saveServiceConfiguration: (state) => {
      state.saving = true;
    },
    saveServiceConfigurationFulfilled: (state) => {
      state.saved = true;
      state.saving = false;
      state.error = null;
    },
    saveServiceConfigurationRejected: (state, action: PayloadAction<IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
      state.saved = false;
      state.saving = false;
    },
  },
});

export const {
  fetchServiceConfiguration,
  fetchServiceConfigurationFulfilled,
  fetchServiceConfigurationRejected,
  saveServiceConfiguration,
  saveServiceConfigurationFulfilled,
  saveServiceConfigurationRejected,
} = manageServiceConfigurationsSlice.actions;

export default manageServiceConfigurationsSlice.reducer;
