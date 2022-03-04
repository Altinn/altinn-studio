import { IApplicationSettings } from 'altinn-shared/types';

export interface IFetchApplicationSettingsFulfilled {
  settings: IApplicationSettings;
}

export interface IFetchApplicationSettingsRejected {
  error: Error;
}
