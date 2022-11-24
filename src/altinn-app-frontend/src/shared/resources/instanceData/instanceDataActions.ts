import { bindActionCreators } from 'redux';

import { store } from 'src/store';

export type IInstanceDataActions = typeof actions;

const actions = {
  getInstanceDataFulfilled: null,
  getInstanceDataRejected: null,
};

export const InstanceDataActions: IInstanceDataActions = bindActionCreators<any, any>(actions, store.dispatch);
