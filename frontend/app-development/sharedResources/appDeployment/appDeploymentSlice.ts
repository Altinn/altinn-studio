import type { PayloadAction } from '@reduxjs/toolkit';
import { createAction, createSlice } from '@reduxjs/toolkit';
import type {
  ICreateAppDeployment,
  ICreateAppDeploymentErrors,
  ICreateAppDeploymentFulfilled,
  ICreateAppDeploymentRejected,
  IDeployment,
  IGetAppDeploymentsFulfilled,
  IGetAppDeploymentsRejected,
} from './types';

export interface IAppDeploymentState {
  deployments: IDeployment[];
  getAppDeploymentsError: Error;
  createAppDeploymentErrors: ICreateAppDeploymentErrors[];
}

const initialState: IAppDeploymentState = {
  deployments: [],
  getAppDeploymentsError: null,
  createAppDeploymentErrors: [],
};

const moduleName = 'appDeployment';

const appDeploymentSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    createAppDeploymentFulfilled: (state, action: PayloadAction<ICreateAppDeploymentFulfilled>) => {
      const { result, envName } = action.payload;
      state.deployments.unshift(result);
      const newList = state.createAppDeploymentErrors.filter((elem: ICreateAppDeploymentErrors) => {
        return elem.env !== envName;
      });
      const newListItem: ICreateAppDeploymentErrors = {
        env: envName,
        errorMessage: null,
        errorCode: null,
      };
      newList.push(newListItem);
      state.createAppDeploymentErrors = newList;
    },
    createAppDeploymentRejected: (state, action: PayloadAction<ICreateAppDeploymentRejected>) => {
      const { error, envName } = action.payload;
      const newList = state.createAppDeploymentErrors.filter((elem: ICreateAppDeploymentErrors) => {
        return elem.env !== envName;
      });
      const newListItem: ICreateAppDeploymentErrors = {
        env: envName,
        errorMessage: error.message,
        errorCode: error.response.status.toString(),
      };
      newList.push(newListItem);
      state.createAppDeploymentErrors = newList;
    },
    getAppDeploymentsFulfilled: (state, action: PayloadAction<IGetAppDeploymentsFulfilled>) => {
      const { deployments } = action.payload;
      state.deployments = deployments.results;
      state.getAppDeploymentsError = null;
    },
    getAppDeploymentsRejected: (state, action: PayloadAction<IGetAppDeploymentsRejected>) => {
      const { error } = action.payload;
      state.getAppDeploymentsError = error;
    },
  },
});

const actions = {
  createAppDeployment: createAction<ICreateAppDeployment>(`${moduleName}/createAppDeployment`),
  getAppDeployments: createAction(`${moduleName}/getAppDeployments`),
  getAppDeploymentsStartInterval: createAction(`${moduleName}/getAppDeploymentsStartInterval`),
  getAppDeploymentsStopInterval: createAction(`${moduleName}/getAppDeploymentsStopInterval`),
};

export const AppDeploymentActions = {
  ...actions,
  ...appDeploymentSlice.actions,
};

export const {
  createAppDeploymentFulfilled,
  createAppDeploymentRejected,
  getAppDeploymentsFulfilled,
  getAppDeploymentsRejected,
} = appDeploymentSlice.actions;

export default appDeploymentSlice.reducer;
