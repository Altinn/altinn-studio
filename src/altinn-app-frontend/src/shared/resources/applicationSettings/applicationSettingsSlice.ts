import { getApplicationSettings } from 'src/shared/resources/applicationSettings/fetch/fetchApplicationSettingsSaga';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import type {
  IFetchApplicationSettingsFulfilled,
  IFetchApplicationSettingsRejected,
} from 'src/shared/resources/applicationSettings/applicationSettingsTypes';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';

import type { IApplicationSettings } from 'altinn-shared/types';

export interface IApplicationSettingsState {
  applicationSettings: IApplicationSettings;
  error: Error;
}

export const initialState: IApplicationSettingsState = {
  applicationSettings: null,
  error: null,
};

const applicationSettingsSlice = createSagaSlice(
  (mkAction: MkActionType<IApplicationSettingsState>) => ({
    name: 'applicationSettings',
    initialState,
    actions: {
      fetchApplicationSettings: mkAction<void>({
        takeLatest: getApplicationSettings,
      }),
      fetchApplicationSettingsFulfilled:
        mkAction<IFetchApplicationSettingsFulfilled>({
          reducer: (state, action) => {
            const { settings } = action.payload;
            state.applicationSettings = settings;
          },
        }),
      fetchApplicationSettingsRejected:
        mkAction<IFetchApplicationSettingsRejected>({
          reducer: (state, action) => {
            const { error } = action.payload;
            state.error = error;
          },
        }),
    },
  }),
);

export const ApplicationSettingsActions = applicationSettingsSlice.actions;
export default applicationSettingsSlice;
