import type { PayloadAction } from '@reduxjs/toolkit';
import { createAction, createSlice } from '@reduxjs/toolkit';

export interface IAppClusterState {
  deploymentList: IEnvironmentItem[];
}

export interface IEnvironmentItem {
  env: string;
  items: any[];
  getStatus: IGetStatus;
}

interface IGetStatus {
  error?: Error;
  success?: boolean;
}

const initialState: IAppClusterState = {
  deploymentList: [],
};

export interface IGetDeployments {
  env: string;
  org: string;
  repo: string;
}
export interface IGetDeploymentsFulfilled {
  result: any;
  env: string;
}
export interface IGetDeploymentsRejected {
  error: Error;
  env: string;
}

const moduleName = 'appCluster';
const actions = {
  getDeployments: createAction<IGetDeployments>(`${moduleName}/getDeployments`),
  getDeploymentsStartInterval: createAction(`${moduleName}/getDeploymentsStartInterval`),
  getDeploymentsStopInterval: createAction(`${moduleName}/getDeploymentsStopInterval`),
};

const appClusterSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    getDeploymentsFulfilled: (state, action: PayloadAction<IGetDeploymentsFulfilled>) => {
      const { result, env } = action.payload;
      const newList = state.deploymentList.filter((elem: IEnvironmentItem) => elem.env !== env);
      const newListItem: IEnvironmentItem = {
        env,
        items: result,
        getStatus: {
          error: null,
          success: true,
        },
      };
      newList.push(newListItem);
      state.deploymentList = newList;
    },
    getDeploymentsRejected: (state, action: PayloadAction<IGetDeploymentsRejected>) => {
      const { error, env } = action.payload;
      const newList = state.deploymentList.filter((elem: IEnvironmentItem) => elem.env !== env);
      const newListItem: IEnvironmentItem = {
        env,
        items: [],
        getStatus: {
          error,
          success: false,
        },
      };
      newList.push(newListItem);
      state.deploymentList = newList;
    },
  },
});

export const { getDeployments, getDeploymentsStartInterval, getDeploymentsStopInterval } = actions;

export const { getDeploymentsFulfilled, getDeploymentsRejected } = appClusterSlice.actions;

export default appClusterSlice.reducer;
