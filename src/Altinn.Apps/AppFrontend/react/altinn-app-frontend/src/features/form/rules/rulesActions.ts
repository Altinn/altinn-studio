import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../../store';
import * as FetchRuleModel from './fetch/fetchRulesActions';
import * as RuleActions from './check/checkRulesActions';

export interface IFormRulesActions extends ActionCreatorsMapObject {
  checkIfRuleShouldRun: (
    lastUpdatedComponentId: string,
    lastUpdatedDataBinding: string,
    lastUpdatedDataValue: string,
    repeatingContainerId?: string,
  ) => RuleActions.ICheckIfRuleShouldRun;
  fetchRuleModel: () => Action;
  fetchRuleModelFulfilled: (formData: any) => FetchRuleModel.IFetchRuleModelFulfilled;
  fetchRuleModelRejected: (error: Error) => FetchRuleModel.IFetchRuleModelRejected;
}

const actions: IFormRulesActions = {
  checkIfRuleShouldRun: RuleActions.checkIfRuleShouldRun,
  fetchRuleModel: FetchRuleModel.fetchRuleModelAction,
  fetchRuleModelFulfilled: FetchRuleModel.fetchRuleModelFulfilledAction,
  fetchRuleModelRejected: FetchRuleModel.fetchRuleModelRejectedAction,
};

const FormRulesActions: IFormRulesActions = bindActionCreators<any, IFormRulesActions>(actions, store.dispatch);

export default FormRulesActions;
