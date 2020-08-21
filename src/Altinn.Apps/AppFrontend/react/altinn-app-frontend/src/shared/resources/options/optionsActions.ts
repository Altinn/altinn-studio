import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { IOption } from 'src/types';
import { store } from '../../../store';

import * as FetchOptions from './fetch/fetchOptionsActions';

export interface IOptionsActions extends ActionCreatorsMapObject {
  fetchOptions: () => Action;
  fetchOptionsFulfilled: (
    optionsId: string,
    options: IOption[],
  ) => FetchOptions.IFetchOptionsFulfilledAction;
  fetchOptionsRecjeted: (
    error: Error,
  ) => FetchOptions.IFetchOptionsRejectedAction;
}

const actions: IOptionsActions = {
  fetchOptions: FetchOptions.fetchOptions,
  fetchOptionsFulfilled: FetchOptions.fetchOptionsFulfilled,
  fetchOptionsRecjeted: FetchOptions.fetchOptionsRejected,
};

const optionsActions: IOptionsActions = bindActionCreators<any, any>(actions, store.dispatch);

export default optionsActions;
