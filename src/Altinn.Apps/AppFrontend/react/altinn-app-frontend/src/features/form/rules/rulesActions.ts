import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../../store';
import * as FetchRuleModel from './fetch/fetchRulesActions';

export interface IFormRulesActions extends ActionCreatorsMapObject {
  fetchRuleModel: () => Action;
  fetchRuleModelFulfilled: (formData: any) => FetchRuleModel.IFetchRuleModelFulfilled;
  fetchRuleModelRejected: (error: Error) => FetchRuleModel.IFetchRuleModelRejected;
}

const actions: IFormRulesActions = {
  fetchRuleModel: FetchRuleModel.fetchRuleModelAction,
  fetchRuleModelFulfilled: FetchRuleModel.fetchRuleModelFulfilledAction,
  fetchRuleModelRejected: FetchRuleModel.fetchRuleModelRejectedAction,
};

const FormRulesActions: IFormRulesActions = bindActionCreators<any, IFormRulesActions>(actions, store.dispatch);

export default FormRulesActions;
