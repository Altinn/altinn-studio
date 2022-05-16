import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import type { IOption, IOptionsMetaData } from 'src/types';
import { store } from 'src/store';

import * as FetchOptions from './fetch/fetchOptionsActions';

export interface IOptionsActions extends ActionCreatorsMapObject {
  fetchOptions: () => Action;
  fetchingOptions: (
    optionsKey: string,
    optionMetaData: IOptionsMetaData,
  ) => FetchOptions.IFetchingOptionsAction;
  fetchOptionsFulfilled: (
    optionsKey: string,
    options: IOption[],
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
