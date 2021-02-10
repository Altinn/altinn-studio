/* eslint-disable no-param-reassign */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as Types from './serviceConfigurationTypes';

const initialState: Types.IServiceConfigurationState = {
  ruleConnection: {},
  conditionalRendering: {},
  manageServiceConfiguration: {
    error: null,
    fetched: false,
    fetching: false,
    saved: false,
    saving: false,
  },
};

const serviceConfigurationSlice = createSlice({
  name: 'serviceConfiguration',
  initialState,
  reducers: {
    addConditionalRenderingConnection: (state, action: PayloadAction<Types.IAddConditionalRendering>) => {
      const { newConnection } = action.payload;
      state.conditionalRendering = {
        ...state.conditionalRendering,
        ...newConnection,
      };
    },
    addRuleConnection: (state, action: PayloadAction<Types.IAddRuleConnection>) => {
      const { newConnection } = action.payload;
      state.ruleConnection = {
        ...state.ruleConnection,
        ...newConnection,
      };
    },
    deleteConditionalRenderingConnnection: (state, action) => {
      const { connectionId } = action.payload;
      delete state.conditionalRendering[connectionId];
    },
    deleteRuleConnnection: (state, action) => {
      const { connectionId } = action.payload;
      delete state.ruleConnection[connectionId];
    },
    fetchServiceConfiguration: (state) => {
      state.manageServiceConfiguration.fetching = true;
    },
    fetchServiceConfigurationFulfilled: (state) => {
      state.manageServiceConfiguration.fetched = true;
      state.manageServiceConfiguration.fetching = false;
      state.manageServiceConfiguration.error = null;
    },
    fetchServiceConfigurationRejected: (state, action: PayloadAction<IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.manageServiceConfiguration.error = error;
      state.manageServiceConfiguration.fetched = false;
      state.manageServiceConfiguration.fetching = false;
    },
    saveServiceConfiguration: (state) => {
      state.manageServiceConfiguration.saving = true;
    },
    saveServiceConfigurationFulfilled: (state) => {
      state.manageServiceConfiguration.saved = true;
      state.manageServiceConfiguration.saving = false;
      state.manageServiceConfiguration.error = null;
    },
    saveServiceConfigurationRejected: (state, action: PayloadAction<IFormDesignerActionRejected>) => {
      const { error } = action.payload;
      state.manageServiceConfiguration.error = error;
      state.manageServiceConfiguration.saved = false;
      state.manageServiceConfiguration.saving = false;
    },
    setConditionalRenderingConnections: (state, action: PayloadAction<Types.ISetConditionalRendering>) => {
      const { conditionalRenderingConnections } = action.payload;
      state.conditionalRendering = { ...conditionalRenderingConnections };
    },
    setRuleConnections: (state, action: PayloadAction<Types.ISetRuleConnection>) => {
      const { ruleConnections } = action.payload;
      state.ruleConnection = { ...ruleConnections };
    },
  },
});

export const {
  addConditionalRenderingConnection,
  addRuleConnection,
  deleteConditionalRenderingConnnection,
  deleteRuleConnnection,
  fetchServiceConfiguration,
  fetchServiceConfigurationFulfilled,
  fetchServiceConfigurationRejected,
  saveServiceConfiguration,
  saveServiceConfigurationFulfilled,
  saveServiceConfigurationRejected,
  setConditionalRenderingConnections,
  setRuleConnections,
} = serviceConfigurationSlice.actions;

export default serviceConfigurationSlice.reducer;
