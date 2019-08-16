import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { IApplicationMetadata } from '..';
import { store } from '../../../../store';

import * as getActions from './get';

export interface IApplicationMetadataActions extends ActionCreatorsMapObject {
  getApplicationMetadata: () => Action;
  getApplicationMetadataFulfilled: (
    applicationMetadata: IApplicationMetadata,
  ) => getActions.IGetApplicationMetadataFulfilled;
  getApplicationMetadataRejected: (
    error: Error,
  ) => getActions.IGetApplicationMetadataRejected;
}

const actions: IApplicationMetadataActions = {
  getApplicationMetadata: getActions.getApplicationMetadata,
  getApplicationMetadataFulfilled: getActions.getApplicationMetadataFulfilled,
  getApplicationMetadataRejected: getActions.getApplicationMetadataRejected,
};

const ApplicationMetadataActionDispatcher: IApplicationMetadataActions =
  bindActionCreators<any, any>(actions, store.dispatch);

export default ApplicationMetadataActionDispatcher;
