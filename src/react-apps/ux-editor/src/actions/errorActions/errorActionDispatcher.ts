import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as ErrorActions from './actions';

export interface IErrorActionDispatchers extends ActionCreatorsMapObject {
  addError: (errorMessage: string) => ErrorActions.IAddErrorAction;
  removeError: (errorIndex: number) => ErrorActions.IRemoveErrorAction;
}

const actions: IErrorActionDispatchers = {
  addError: ErrorActions.addErrorMessage,
  removeError: ErrorActions.removeErrorMessage,
};

const ErrorActionDispatchers: IErrorActionDispatchers = bindActionCreators<any, IErrorActionDispatchers>(actions, store.dispatch);
export default ErrorActionDispatchers;
