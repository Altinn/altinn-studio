import { createSagaSlice } from 'src/redux/sagaSlice';
import type { IFetchApplicationSettingsFulfilled } from 'src/features/applicationSettings/applicationSettingsTypes';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';
import type { IApplicationSettings } from 'src/types/shared';

export interface IApplicationSettingsState {
  applicationSettings: IApplicationSettings | null;
}

export const initialState: IApplicationSettingsState = {
  applicationSettings: null,
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
    },
  }));

  ApplicationSettingsActions = slice.actions;
  return slice;
};
