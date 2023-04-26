import { createSagaSlice } from 'src/redux/sagaSlice';
import type {
  IFetchApplicationSettingsFulfilled,
  IFetchApplicationSettingsRejected,
} from 'src/features/applicationSettings/applicationSettingsTypes';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';
import type { IApplicationSettings } from 'src/types/shared';

export interface IApplicationSettingsState {
  applicationSettings: IApplicationSettings | null;
  error: Error | null;
}

export const initialState: IApplicationSettingsState = {
  applicationSettings: null,
  error: null,
};

export let ApplicationSettingsActions: ActionsFromSlice<typeof applicationSettingsSlice>;
export const applicationSettingsSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IApplicationSettingsState>) => ({
    name: 'applicationSettings',
    initialState,
    actions: {
      fetchApplicationSettingsFulfilled: mkAction<IFetchApplicationSettingsFulfilled>({
        reducer: (state, action) => {
          const { settings } = action.payload;
          state.applicationSettings = settings;
        },
      }),
      fetchApplicationSettingsRejected: mkAction<IFetchApplicationSettingsRejected>({
        reducer: (state, action) => {
          const { error } = action.payload;
          state.error = error;
        },
      }),
    },
  }));

  ApplicationSettingsActions = slice.actions;
  return slice;
};
