import { bindActionCreators } from 'redux';
import { store } from 'src/store';
import * as CompleteProcessActions from './completeProcess/completeProcessActions';
import * as GetProcessStateActions from './getProcessState/getProcessStateActions';
import * as CheckProcessUpdatedActions from './checkProcessUpdated/checkProcessUpdatedActions';

/**
 * Define a interface describing the different Actions available
 * and which datamodel those actions expect.
 */
export type IProcessDispatchers = typeof actions;

/**
 * Define mapping between action and Action dispatcher method
 */
const actions = {
  getProcessState: GetProcessStateActions.getProcessStateAction,
  getProcessStateFulfilled:
    GetProcessStateActions.getProcessStateFulfilledAction,
  getProcessStateRejected: GetProcessStateActions.getProcessStateRejectedAction,
  completeProcess: CompleteProcessActions.completeProcess,
  completeProcessFulfilled:
    CompleteProcessActions.getProcessStateFulfilledAction,
  completeProcessRejected: CompleteProcessActions.getProcessStateRejectedAction,
  checkProcessUpdated: CheckProcessUpdatedActions.CheckProcessUpdated,
};

/**
 * Bind action creators to redux store
 */
const ProcessDispatcher: IProcessDispatchers = bindActionCreators<
  any,
  IProcessDispatchers
>(actions, store.dispatch);

/**
 * Export the dispatcher to be used from REACT components
 */
export default ProcessDispatcher;
