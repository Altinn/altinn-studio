import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as ThirdPartyComponentsActions from './actions';

export interface IThirdPartyComponentsActionDispatcher extends ActionCreatorsMapObject {
  fetchThirdPartyComponents: (location: string) => ThirdPartyComponentsActions.IFetchThirdPartyComponent;
  fetchThirdPartyComponentsFulfilled: (components: any) => ThirdPartyComponentsActions.IFetchThirdPartyComponentFulfilled;
  fetchThirdPartyComponentsRejected: (error: Error) => ThirdPartyComponentsActions.IFetchThirdPartyComponentRejected;
}

const actions: IThirdPartyComponentsActionDispatcher = {
  fetchThirdPartyComponents: ThirdPartyComponentsActions.fetchThirdPartyComponents,
  fetchThirdPartyComponentsFulfilled: ThirdPartyComponentsActions.fetchThirdPartyComponentsFulfilled,
  fetchThirdPartyComponentsRejected: ThirdPartyComponentsActions.fetchThirdPartyComponentsRejected,
};

const ThirdPartyComponentsActionDispatcher: IThirdPartyComponentsActionDispatcher = bindActionCreators<
  any,
  IThirdPartyComponentsActionDispatcher
  >(actions, store.dispatch);

export default ThirdPartyComponentsActionDispatcher;
