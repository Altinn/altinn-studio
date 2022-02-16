import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { IOptionData } from 'src/types';
import { store } from '../../../store';

import * as FetchOptions from './fetch/fetchOptionsActions';

export interface IOptionsActions extends ActionCreatorsMapObject {
  fetchOptions: () => Action;
  fetchingOptions: (
    optionsKey: string,
  ) => FetchOptions.IFetchingOptionsAction;
  fetchOptionsFulfilled: (
    optionsKey: string,
    optionData: IOptionData,
  ) => FetchOptions.IFetchOptionsFulfilledAction;
  fetchOptionsRejected: (
    optionsKey: string,
    error: Error,
  ) => FetchOptions.IFetchOptionsRejectedAction;
}

const actions: IOptionsActions = {
  fetchOptions: FetchOptions.fetchOptions,
  fetchingOptions: FetchOptions.fetchingOptions,
  fetchOptionsFulfilled: FetchOptions.fetchOptionsFulfilled,
  fetchOptionsRejected: FetchOptions.fetchOptionsRejected,
};

const optionsActions: IOptionsActions = bindActionCreators<any, any>(actions, store.dispatch);

export default optionsActions;
