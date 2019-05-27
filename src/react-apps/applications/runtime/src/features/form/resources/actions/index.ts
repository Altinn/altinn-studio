import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import * as Actions from './fetch';

import { store } from '../../../../store';

export interface IFormResourceActions extends ActionCreatorsMapObject {
  fetchFormResource: (url: string) => Actions.IFetchFormResource;
  fetchFormResourceFulfilled: (resource: any) => Actions.IFetchFormResourceFulfilled;
  fetchFormResourceRejected: (error: Error) => Actions.IFetchFormResourceRejected;
}

const actions: IFormResourceActions = {
  fetchFormResource: Actions.fetchFormResource,
  fetchFormResourceFulfilled: Actions.fetchFormResourceFulfilled,
  fetchFormResourceRejected: Actions.fetchFormResourceRejected,
};

const FormResourceActions = bindActionCreators(actions, store.dispatch);

export default FormResourceActions;
