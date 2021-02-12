/* eslint-disable no-param-reassign */
import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IUserState {
  permissions: IUserPermissions;
  error: Error;
}

export interface IUserPermissions {
  deploy: IDeployPermissions;
}

export interface IDeployPermissions {
  environments: string[];
}

const initialState: IUserState = {
  permissions: {
    deploy: {
      environments: [],
    },
  },
  error: null,
};

export interface IFetchDeployPermissionsFulfilled {
  environments: string[];
}

export interface IUserActionRejected {
  error: Error;
}

const moduleName = 'user';
const userSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    fetchDeployPermissionsFulfilled: (
      state: IUserState, action: PayloadAction<IFetchDeployPermissionsFulfilled>,
    ) => {
      const { environments } = action.payload;
      state.permissions.deploy.environments = environments;
      state.error = null;
    },
    fetchDeployPermissionsRejected: (
      state: IUserState, action: PayloadAction<IUserActionRejected>,
    ) => {
      const { error } = action.payload;
      state.error = error;
    },
  },
});

export const fetchDeployPermissions = createAction(`${moduleName}/fetchDeployPermissions`);

export const {
  fetchDeployPermissionsFulfilled,
  fetchDeployPermissionsRejected,
} = userSlice.actions;

export default userSlice.reducer;
