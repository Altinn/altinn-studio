import { bindActionCreators } from 'redux';
import { store } from 'src/store';

import * as GetInstanceData from './get/getInstanceDataActions';

export type IInstanceDataActions = typeof actions;

const actions = {
  getInstanceData: GetInstanceData.getInstanceData,
  getInstanceDataFulfilled: GetInstanceData.getInstanceDataFulfilled,
  getInstanceDataRejected: GetInstanceData.getInstanceDataRejected,
};

const InstanceDataActions: IInstanceDataActions = bindActionCreators<any, any>(actions, store.dispatch);

export default InstanceDataActions;
