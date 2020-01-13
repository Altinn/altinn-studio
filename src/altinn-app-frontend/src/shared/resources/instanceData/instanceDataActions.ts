import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../../store';

import * as GetInstanceData from './get/getInstanceDataActions';

export interface IInstanceDataActions extends ActionCreatorsMapObject {
  getInstanceData: ( instanceOwner: string, instanceId: string ) => GetInstanceData.IGetInstanceData;
  getInstanceDataFulfilled: ( instanceData: any ) => GetInstanceData.IGetInstanceDataFulfilled;
  getInstanceDataRejected: ( error: Error ) => GetInstanceData.IGetInstanceDataRejected;
}

const actions: IInstanceDataActions = {
  getInstanceData: GetInstanceData.getInstanceData,
  getInstanceDataFulfilled: GetInstanceData.getInstanceDataFulfilled,
  getInstanceDataRejected: GetInstanceData.getInstanceDataRejected,
};

const InstanceDataActions: IInstanceDataActions = bindActionCreators<any, any>(actions, store.dispatch);

export default InstanceDataActions;
