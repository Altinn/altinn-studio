/* tslint:disable:max-line-length */
import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as GetEnvironments from './getEnvironments/getEnvironmentsActions';

/**
 * Define a interface describing the the different Actions available
 * and which datamodel those actions expect.
 */
export interface IConfigurationDispatcher extends ActionCreatorsMapObject {
  getEnvironments: () => Action;
  getEnvironmentsFulfilled: (result: any) => GetEnvironments.IGetEnvironmentsFulfilled;
  getEnvironmentsRejected: (error: Error) => GetEnvironments.IGetEnvironmentsRejected;
}

/**
 * Define mapping between action and Action dispatcher method
 */

const actions: IConfigurationDispatcher = {
  getEnvironments: GetEnvironments.GetEnvironmentsAction,
  getEnvironmentsFulfilled: GetEnvironments.GetEnvironmentsFulfilledAction,
  getEnvironmentsRejected: GetEnvironments.GetEnvironmentsRejectedAction,
};

/**
 * Bind action creators to redux store
 */
const ConfigurationDispatchers: IConfigurationDispatcher = bindActionCreators<
  any,
  IConfigurationDispatcher
>(actions, store.dispatch);

/**
 * Export the dispatcher to be used from REACT components
 */
export default ConfigurationDispatchers;
