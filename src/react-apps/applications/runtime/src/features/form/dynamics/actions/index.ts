import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../../../store';

import * as ApiActions from './api';
import * as ConditionalRenderActions from './conditionalRendering';

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
}

const actions: IFormDynamicsActions = {
  checkIfApiShouldFetch: ApiActions.checkIfApiShouldFetch,
  checkIfConditionalRulesShouldRun: ConditionalRenderActions.checkIfConditionalRulesShouldRun,
}

const FormDynamicsRules: IFormDynamicsActions = bindActionCreators<any, any>(actions, store.dispatch);

export default FormDynamicsRules;