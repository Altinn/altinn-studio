import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../../../store';
import * as FetchFormUserActions from './fetch';

export interface IFormUserActions extends ActionCreatorsMapObject {
  fetchFormUser: (url: string) => FetchFormUserActions.IFetchFormUser;
  fetchFormUserFulfilled: (
    firstName: string,
    middleName: string,
    lastName: string,
    organization: string,
  ) => FetchFormUserActions.IFetchFormUserFulfilled;
  fetchFormUserRejected: (error: Error) => FetchFormUserActions.IFetchFormUserRejected;
}

const actions: IFormUserActions = {
  fetchFormUser: FetchFormUserActions.fetchFormUser,
  fetchFormUserFulfilled: FetchFormUserActions.fetchFormUserFulfilled,
  fetchFormUserRejected: FetchFormUserActions.fetchFormUserRejected,
};

const FormUserActions: IFormUserActions = bindActionCreators(actions, store.dispatch);

export default FormUserActions;
