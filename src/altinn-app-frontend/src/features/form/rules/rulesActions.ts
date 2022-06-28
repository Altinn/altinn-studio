import { bindActionCreators } from "redux";
import { store } from "src/store";
import * as FetchRuleModel from "./fetch/fetchRulesActions";

export type IFormRulesActions = typeof actions;

const actions = {
  fetchRuleModel: FetchRuleModel.fetchRuleModelAction,
  fetchRuleModelFulfilled: FetchRuleModel.fetchRuleModelFulfilledAction,
  fetchRuleModelRejected: FetchRuleModel.fetchRuleModelRejectedAction,
};

const FormRulesActions: IFormRulesActions = bindActionCreators<
  any,
  IFormRulesActions
>(actions, store.dispatch);

export default FormRulesActions;
