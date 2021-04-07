/* eslint-disable import/no-cycle */
/* eslint-disable no-param-reassign */
import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ICommit, IRepository, IServiceDescription, IServiceId, IServiceName } from '../../types/global';
import * as hSITypes from './types';

export interface IHandleServiceInformationState {
  repositoryInfo: IRepository;
  serviceNameObj: IServiceName;
  serviceDescriptionObj: IServiceDescription;
  serviceIdObj: IServiceId;
  initialCommit: ICommit;
  error: Error;
}

const initialState: IHandleServiceInformationState = {
  repositoryInfo: null,
  serviceNameObj: {
    name: '',
    saving: false,
  },
  serviceDescriptionObj: {
    description: '',
    saving: false,
  },
  serviceIdObj: {
    serviceId: '',
    saving: false,
  },
  initialCommit: null,
  error: null,
};

const moduleName = 'handleServiceInformation';
const handleServiceInformationSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    fetchInitialCommitFulfilled: (state, action: PayloadAction<hSITypes.IFetchInitialCommitFulfilled>) => {
      const { result } = action.payload;
      state.initialCommit = result;
    },
    fetchInitialCommitRejected: (state, action: PayloadAction<hSITypes.IHandleServiceInformationActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    fetchServiceFulfilled: (state, action: PayloadAction<hSITypes.IFetchServiceFulfilled>) => {
      const { repository } = action.payload;
      state.repositoryInfo = repository;
    },
    fetchServiceRejected: (state, action: PayloadAction<hSITypes.IHandleServiceInformationActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    fetchServiceConfigFulfilled: (state, action: PayloadAction<hSITypes.IFetchServiceConfigFulfilled>) => {
      const { serviceConfig } = action.payload;
      state.serviceDescriptionObj.description = serviceConfig?.serviceDescription || '';
      state.serviceIdObj.serviceId = serviceConfig?.serviceId || '';
    },
    fetchServiceConfigRejected: (state, action: PayloadAction<hSITypes.IHandleServiceInformationActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    fetchServiceNameFulfilled: (state, action: PayloadAction<hSITypes.IFetchServiceNameFulfilled>) => {
      const { serviceName } = action.payload;
      state.serviceNameObj.name = serviceName;
      state.serviceNameObj.saving = false;
    },
    fetchServiceNameRejected: (state, action: PayloadAction<hSITypes.IHandleServiceInformationActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    saveServiceConfig: (state, action: PayloadAction<hSITypes.ISaveServiceConfigAction>) => {
      state.serviceDescriptionObj.saving = true;
      state.serviceIdObj.saving = true;
    },
    saveServiceConfigFulfilled: (state, action: PayloadAction<hSITypes.ISaveServiceConfigFulfilled>) => {
      const { newServiceDescription, newServiceId } = action.payload;
      state.serviceDescriptionObj.description = newServiceDescription;
      state.serviceIdObj.serviceId = newServiceId;
      state.serviceDescriptionObj.saving = false;
      state.serviceIdObj.saving = false;
    },
    saveServiceConfigRejected: (state, action: PayloadAction<hSITypes.IHandleServiceInformationActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
      state.serviceDescriptionObj.saving = false;
      state.serviceIdObj.saving = false;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    saveServiceName: (state, action: PayloadAction<hSITypes.ISaveServiceNameAction>) => {
      state.serviceNameObj.saving = true;
    },
    saveServiceNameFulfilled: (state, action: PayloadAction<hSITypes.ISaveServiceNameFulfilled>) => {
      const { newServiceName } = action.payload;
      state.serviceNameObj.name = newServiceName;
      state.serviceNameObj.saving = false;
    },
    saveServiceNameRejected: (state, action: PayloadAction<hSITypes.IHandleServiceInformationActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
      state.serviceNameObj.saving = false;
    },
  },
});

const actions = {
  fetchService: createAction<hSITypes.IFetchServiceAction>(`${moduleName}/fetchService`),
  fetchServiceConfig: createAction<hSITypes.IFetchServiceConfigAction>(`${moduleName}/fetchServiceConfig`),
  fetchServiceName: createAction<hSITypes.IFetchServiceNameAction>(`${moduleName}/fetchServiceName`),
  fetchInitialCommit: createAction<hSITypes.IFetchInitialCommitAction>(`${moduleName}/fetchInitialCommit`),
};

export const HandleServiceInformationActions = {
  ...actions,
  ...handleServiceInformationSlice.actions,
};

export default handleServiceInformationSlice.reducer;
