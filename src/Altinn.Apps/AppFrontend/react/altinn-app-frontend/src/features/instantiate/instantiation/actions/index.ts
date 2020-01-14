import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../../../store';
import * as InstantiateActions from './instantiate';

export interface IInstantiationActions extends ActionCreatorsMapObject {
  instantiate: (org: string, app: string) => InstantiateActions.IInstantiate;
  instantiateFulfilled: (instanceId: string) => InstantiateActions.IInstantiateFulfilled;
  instantiateRejected: (error: Error) => InstantiateActions.IInstantiateRejected;
  instantiateToggle: () => Action;
}

const actions: IInstantiationActions = {
  instantiate: InstantiateActions.instantiate,
  instantiateFulfilled: InstantiateActions.instantiateFulfilled,
  instantiateRejected: InstantiateActions.instantiateRejected,
  instantiateToggle: InstantiateActions.instantiateToggle,
};

const InstantiationActions: IInstantiationActions = bindActionCreators(actions, store.dispatch);
export default InstantiationActions;
