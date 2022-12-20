import type { PayloadAction } from '@reduxjs/toolkit';
import { createAction, createSlice } from '@reduxjs/toolkit';
import type {
  ICommit,
  IRepository,
  IServiceDescription,
  IServiceId,
  IServiceName,
} from '../../types/global';
import type {
  IFetchInitialCommitFulfilled,
  IHandleServiceInformationActionRejected,
  IFetchServiceFulfilled,
  IFetchServiceConfigFulfilled,
  IFetchServiceNameFulfilled,
  ISaveServiceConfigAction,
  ISaveServiceConfigFulfilled,
  ISaveServiceNameAction,
  ISaveServiceNameFulfilled,
  IFetchServiceAction,
  IFetchServiceConfigAction,
  IFetchServiceNameAction,
  IFetchInitialCommitAction,
} from './types';

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
    fetchInitialCommitFulfilled: (state, action: PayloadAction<IFetchInitialCommitFulfilled>) => {
      const { result } = action.payload;
      state.initialCommit = result;
    },
    fetchInitialCommitRejected: (
      state,
      action: PayloadAction<IHandleServiceInformationActionRejected>
    ) => {
      const { error } = action.payload;
      state.error = error;
    },
    fetchServiceFulfilled: (state, action: PayloadAction<IFetchServiceFulfilled>) => {
      const { repository } = action.payload;
      state.repositoryInfo = repository;
    },
    fetchServiceRejected: (
      state,
      action: PayloadAction<IHandleServiceInformationActionRejected>
    ) => {
      const { error } = action.payload;
      state.error = error;
    },
    fetchServiceConfigFulfilled: (state, action: PayloadAction<IFetchServiceConfigFulfilled>) => {
      const { serviceConfig } = action.payload;
      state.serviceDescriptionObj.description = serviceConfig?.serviceDescription || '';
      state.serviceIdObj.serviceId = serviceConfig?.serviceId || '';
    },
    fetchServiceConfigRejected: (
      state,
      action: PayloadAction<IHandleServiceInformationActionRejected>
    ) => {
      const { error } = action.payload;
      state.error = error;
    },
    fetchServiceNameFulfilled: (state, action: PayloadAction<IFetchServiceNameFulfilled>) => {
      const { serviceName } = action.payload;
      state.serviceNameObj.name = serviceName;
      state.serviceNameObj.saving = false;
    },
    fetchServiceNameRejected: (
      state,
      action: PayloadAction<IHandleServiceInformationActionRejected>
    ) => {
      const { error } = action.payload;
      state.error = error;
    },
    saveServiceConfig: (
      state,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      action: PayloadAction<ISaveServiceConfigAction>
    ) => {
      state.serviceDescriptionObj.saving = true;
      state.serviceIdObj.saving = true;
    },
    saveServiceConfigFulfilled: (state, action: PayloadAction<ISaveServiceConfigFulfilled>) => {
      const { newServiceDescription, newServiceId } = action.payload;
      state.serviceDescriptionObj.description = newServiceDescription;
      state.serviceIdObj.serviceId = newServiceId;
      state.serviceDescriptionObj.saving = false;
      state.serviceIdObj.saving = false;
    },
    saveServiceConfigRejected: (
      state,
      action: PayloadAction<IHandleServiceInformationActionRejected>
    ) => {
      const { error } = action.payload;
      state.error = error;
      state.serviceDescriptionObj.saving = false;
      state.serviceIdObj.saving = false;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    saveServiceName: (state, action: PayloadAction<ISaveServiceNameAction>) => {
      state.serviceNameObj.saving = true;
    },
    saveServiceNameFulfilled: (state, action: PayloadAction<ISaveServiceNameFulfilled>) => {
      const { newServiceName } = action.payload;
      state.serviceNameObj.name = newServiceName;
      state.serviceNameObj.saving = false;
    },
    saveServiceNameRejected: (
      state,
      action: PayloadAction<IHandleServiceInformationActionRejected>
    ) => {
      const { error } = action.payload;
      state.error = error;
      state.serviceNameObj.saving = false;
    },
  },
});

const actions = {
  fetchService: createAction<IFetchServiceAction>(`${moduleName}/fetchService`),
  fetchServiceConfig: createAction<IFetchServiceConfigAction>(`${moduleName}/fetchServiceConfig`),
  fetchServiceName: createAction<IFetchServiceNameAction>(`${moduleName}/fetchServiceName`),
  fetchInitialCommit: createAction<IFetchInitialCommitAction>(`${moduleName}/fetchInitialCommit`),
};

export const HandleServiceInformationActions = {
  ...actions,
  ...handleServiceInformationSlice.actions,
};

export default handleServiceInformationSlice.reducer;
