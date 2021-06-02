import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../../store';

import * as ApiActions from './api/apiActions';
import * as ConditionalRenderActions from './conditionalRendering/conditionalRenderingActions';
import * as FetchDynamicActions from './fetch/fetchFormDynamicsActions';

export interface IFormDynamicsActions extends ActionCreatorsMapObject {
  checkIfApiShouldFetch: (
    updatedComponentId: string,
    updatedDataField: string,
    updatedData: string,
    repeating: boolean,
    dataModelGroup?: string,
    index?: number,
  ) => ApiActions.ICheckIfApiShouldFetchAction;
  checkIfConditionalRulesShouldRun: (
    repeatingContainerId?: string,
  ) => ConditionalRenderActions.ICheckIfConditionalRulesShouldRun;
  fetchFormDynamics: () => Action;
  fetchFormDynamicsFulfilled: (
    apis: any,
    roleConnections: any,
    conditionalRendering: any,
  ) => FetchDynamicActions.IFetchServiceConfigFulfilled;
  fetchFormDynamicsRejected: (error: Error) => FetchDynamicActions.IFetchServiceConfigRejected;
}

const actions: IFormDynamicsActions = {
  checkIfApiShouldFetch: ApiActions.checkIfApiShouldFetch,
  checkIfConditionalRulesShouldRun: ConditionalRenderActions.checkIfConditionalRulesShouldRun,
  fetchFormDynamics: FetchDynamicActions.fetchServiceConfig,
  fetchFormDynamicsFulfilled: FetchDynamicActions.fetchServiceConfigFulfilled,
  fetchFormDynamicsRejected: FetchDynamicActions.fetchServiceConfigRejected,
};

const FormDynamicsRules: IFormDynamicsActions = bindActionCreators<any, any>(actions, store.dispatch);

export default FormDynamicsRules;
