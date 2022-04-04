import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  IAppReleaseErrors,
  ICreateReleaseAction,
  ICreateReleaseFulfilledAction,
  ICreateReleaseRejectedActions,
  IGetReleaseActionFulfilled,
  IGetReleaseActionRejected,
  IRelease,
} from './types';

export interface IAppReleaseState {
  releases: IRelease[];
  creatingRelease: boolean;
  errors: IAppReleaseErrors;
}

const initialState: IAppReleaseState = {
  releases: [],
  creatingRelease: false,
  errors: {
    createReleaseErrorCode: null,
    fetchReleaseErrorCode: null,
  },
};
const moduleName = 'appRelease';

const appReleaseSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createAppRelease: (state, action: PayloadAction<ICreateReleaseAction>) => {
      state.creatingRelease = true;
      state.errors.createReleaseErrorCode = null;
    },
    createAppReleasesFulfilled: (
      state,
      action: PayloadAction<ICreateReleaseFulfilledAction>,
    ) => {
      const { release } = action.payload;
      state.releases.unshift(release);
      state.creatingRelease = false;
      state.errors.createReleaseErrorCode = null;
    },
    createAppReleasesRejected: (
      state,
      action: PayloadAction<ICreateReleaseRejectedActions>,
    ) => {
      const { errorCode } = action.payload;
      state.errors.createReleaseErrorCode = errorCode;
      state.creatingRelease = false;
    },
    getAppReleasesFulfilled: (
      state,
      action: PayloadAction<IGetReleaseActionFulfilled>,
    ) => {
      const { releases } = action.payload;
      state.releases = releases;
      state.errors.fetchReleaseErrorCode = null;
    },
    getAppReleasesRejected: (
      state,
      action: PayloadAction<IGetReleaseActionRejected>,
    ) => {
      const { errorCode } = action.payload;
      state.errors.fetchReleaseErrorCode = errorCode;
    },
  },
});

const actions = {
  getAppRelease: createAction(`${moduleName}/getAppRelease`),
  getAppReleaseStartInterval: createAction(
    `${moduleName}/getAppReleaseStartInterval`,
  ),
  getAppReleaseStopInterval: createAction(
    `${moduleName}/getAppReleaseStopInterval`,
  ),
};

export const AppReleaseActions = {
  ...actions,
  ...appReleaseSlice.actions,
};

export default appReleaseSlice.reducer;
