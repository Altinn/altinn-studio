/* tslint:disable:max-line-length */
import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as GetProcessStateActions from './getProcessState/getProcessStateActions';
import * as StartProcessActions from './startProcess/startProcessActions';

/**
 * Define a interface describing the the different Actions available
 * and which datamodel those actions expect.
 */
export interface IProcessStateDispatchers extends ActionCreatorsMapObject {
  getProcessState: () => Action;
  getProcessStateFulfilled: (result: any) => GetProcessStateActions.IGetProcessStateFulfilled;
  getProcessStateRejected: (result: Error) => GetProcessStateActions.IGetProcessStateRejected;
  startProcess: () => Action;
  startProcessFulfilled: (result: any) => StartProcessActions.IStartProcessFulfilled;
  startProcessRejected: (Error: Error) => StartProcessActions.IStartProcessRejected;
}

/**
 * Define mapping between action and Action dispatcher method
 */

const actions: IProcessStateDispatchers = {
  getProcessState: GetProcessStateActions.getProcessStateAction,
  getProcessStateFulfilled: GetProcessStateActions.getProcessStateFulfilledAction,
  getProcessStateRejected: GetProcessStateActions.getProcessStateRejectedAction,
  startProcess: StartProcessActions.startProcess,
  startProcessFulfilled: StartProcessActions.startProcessFulfilled,
  startProcessRejected: StartProcessActions.startProcessRejected,
};

/**
 * Bind action creators to redux store
 */
const ProcessStateActionDispatchers: IProcessStateDispatchers = bindActionCreators<
  any,
  IProcessStateDispatchers
>(actions, store.dispatch);

/**
 * Export the dispatcher to be used from REACT components
 */
export default ProcessStateActionDispatchers;
