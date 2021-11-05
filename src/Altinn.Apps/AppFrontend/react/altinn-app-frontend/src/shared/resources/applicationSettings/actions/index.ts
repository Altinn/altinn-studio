import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { IApplicationSettings } from '..';
import { store } from '../../../../store';

import * as getActions from './get';

export interface IApplicationSettingsActions extends ActionCreatorsMapObject {
  getApplicationSettings: () => Action;
  getApplicationSettingsFulfilled: (
    applicationMetadata: IApplicationSettings,
  ) => getActions.IGetApplicationSettingsFulfilled;
  getApplicationSettingsRejected: (
    error: Error,
  ) => getActions.IGetApplicationSettingsRejected;
}

const actions: IApplicationSettingsActions = {
  getApplicationSettings: getActions.getApplicationSettings,
  getApplicationSettingsFulfilled: getActions.getApplicationSettingsFulfilled,
  getApplicationSettingsRejected: getActions.getApplicationSettingsRejected,
};

const ApplicationSettingsActionDispatcher: IApplicationSettingsActions =
  bindActionCreators<any, any>(actions, store.dispatch);

export default ApplicationSettingsActionDispatcher;
