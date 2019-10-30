/* tslint:disable:max-line-length */
import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as ProcessStateActions from './getProcessState/getProcessStateActions';

/**
 * Define a interface describing the the different Actions available
 * and which datamodel those actions expect.
 */
export interface IProcessStateDispatchers extends ActionCreatorsMapObject {
  getProcessState: (instanceId: string) => ProcessStateActions.IGetProcessState;
  getProcessStateFulfilled: (result: any) => ProcessStateActions.IGetProcessStateFulfilled;
  getProcessStateRejected: (result: Error) => ProcessStateActions.IGetProcessStateRejected;
}

/**
 * Define mapping between action and Action dispatcher method
 */

const actions: IProcessStateDispatchers = {
  getProcessState: ProcessStateActions.getProcessStateAction,
  getProcessStateFulfilled: ProcessStateActions.getProcessStateFulfilledAction,
  getProcessStateRejected: ProcessStateActions.getProcessStateRejectedAction,
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
