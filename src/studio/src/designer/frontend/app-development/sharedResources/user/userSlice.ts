import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IUserState {
  permissions: IUserPermissions;
  session: IUserSession;
  error: Error;
}

export interface IUserPermissions {
  deploy: IDeployPermissions;
}

export interface IUserSession {
  remainingMinutes: number;
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
  session: {
    remainingMinutes: 120,
  },
  error: null,
};

export interface IFetchDeployPermissionsFulfilled {
  environments: string[];
}

export interface IUserActionRejected {
  error: Error;
}

export interface IFetchRemainingSessionFulfilled {
  remainingMinutes: number;
}

export interface IKeepAliveSessionFulfilled {
  remainingMinutes: number;
}

const moduleName = 'user';
const userSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    fetchDeployPermissionsFulfilled: (
      state: IUserState,
      action: PayloadAction<IFetchDeployPermissionsFulfilled>,
    ) => {
      const { environments } = action.payload;
      state.permissions.deploy.environments = environments;
      state.error = null;
    },
    fetchDeployPermissionsRejected: (
      state: IUserState,
      action: PayloadAction<IUserActionRejected>,
    ) => {
      const { error } = action.payload;
      state.error = error;
    },
    fetchRemainingSessionFulfilled: (
      state: IUserState,
      action: PayloadAction<IFetchRemainingSessionFulfilled>,
    ) => {
      const { remainingMinutes } = action.payload;
      state.session.remainingMinutes = remainingMinutes;
    },
    fetchRemainingSessionRejected: (
      state: IUserState,
      action: PayloadAction<IUserActionRejected>,
    ) => {
      const { error } = action.payload;
      state.error = error;
    },
    keepAliveSessionFulfilled: (
      state: IUserState,
      action: PayloadAction<IKeepAliveSessionFulfilled>,
    ) => {
      const { remainingMinutes } = action.payload;
      state.session.remainingMinutes = remainingMinutes;
    },
    keepAliveSessionRejected: (
      state: IUserState,
      action: PayloadAction<IUserActionRejected>,
    ) => {
      const { error } = action.payload;
      state.error = error;
    },
  },
});

export const fetchDeployPermissions = createAction(
  `${moduleName}/fetchDeployPermissions`,
);

export const fetchRemainingSession = createAction(
  `${moduleName}/fetchRemainingSession`,
);

export const keepAliveSession = createAction(`${moduleName}/keepAliveSession`);

export const signOutUser = createAction(`${moduleName}/signOutUser`);

export const {
  fetchDeployPermissionsFulfilled,
  fetchDeployPermissionsRejected,
  fetchRemainingSessionFulfilled,
  fetchRemainingSessionRejected,
  keepAliveSessionFulfilled,
  keepAliveSessionRejected,
} = userSlice.actions;

export default userSlice.reducer;
