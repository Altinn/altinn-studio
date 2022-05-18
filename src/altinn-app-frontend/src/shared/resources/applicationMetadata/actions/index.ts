import { bindActionCreators } from 'redux';
import { store } from 'src/store';

import * as getActions from './get';

export type IApplicationMetadataActions = typeof actions;

const actions = {
  getApplicationMetadata: getActions.getApplicationMetadata,
  getApplicationMetadataFulfilled: getActions.getApplicationMetadataFulfilled,
  getApplicationMetadataRejected: getActions.getApplicationMetadataRejected,
};

const ApplicationMetadataActionDispatcher: IApplicationMetadataActions =
  bindActionCreators<any, any>(actions, store.dispatch);

export default ApplicationMetadataActionDispatcher;
