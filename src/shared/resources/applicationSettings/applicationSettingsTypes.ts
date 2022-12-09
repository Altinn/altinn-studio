import type { IApplicationSettings } from 'src/types/shared';

export interface IFetchApplicationSettingsFulfilled {
  settings: IApplicationSettings;
}

export interface IFetchApplicationSettingsRejected {
  error: Error;
}
