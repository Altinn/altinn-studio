import { IApplicationSettings } from '../../../types';

export interface IFetchApplicationSettingsFulfilled {
  settings: IApplicationSettings;
}

export interface IApplicationSettingsActionRejected {
  error: Error;
}
