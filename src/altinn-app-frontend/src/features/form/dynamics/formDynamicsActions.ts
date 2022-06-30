import { bindActionCreators } from 'redux';
import { store } from 'src/store';

import * as ConditionalRenderActions from './conditionalRendering/conditionalRenderingActions';
import * as FetchDynamicActions from './fetch/fetchFormDynamicsActions';

export type IFormDynamicsActions = typeof actions;

const actions = {
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
