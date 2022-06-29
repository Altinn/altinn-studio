import { bindActionCreators } from 'redux';
import { store } from 'src/store';

import * as ApiActions from './api/apiActions';
import * as ConditionalRenderActions from './conditionalRendering/conditionalRenderingActions';
import * as FetchDynamicActions from './fetch/fetchFormDynamicsActions';

export type IFormDynamicsActions = typeof actions;

const actions = {
  checkIfApiShouldFetch: ApiActions.checkIfApiShouldFetch,
  checkIfConditionalRulesShouldRun:
    ConditionalRenderActions.checkIfConditionalRulesShouldRun,
  fetchFormDynamics: FetchDynamicActions.fetchServiceConfig,
  fetchFormDynamicsFulfilled: FetchDynamicActions.fetchServiceConfigFulfilled,
  fetchFormDynamicsRejected: FetchDynamicActions.fetchServiceConfigRejected,
};

const FormDynamicsRules: IFormDynamicsActions = bindActionCreators<any, any>(
  actions,
  store.dispatch,
);

export default FormDynamicsRules;
