import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as RuleConnectionActions from './actions';

export interface IRuleConnectionActionDispatchers extends ActionCreatorsMapObject {
  addRuleConnection: (newConnection: any) => RuleConnectionActions.IAddRuleConnection;
  addRuleConnectionFulfilled: (newConnection: any) => RuleConnectionActions.IAddRuleConnectionFulfilled;
  addRuleConnectionRejected: (error: Error) => RuleConnectionActions.IAddRuleConnectionRejected;
  delRuleConnection: (connectionId: any) => RuleConnectionActions.IDelRuleConnection;
  delRuleConnectionFulfilled: (newConnectionObj: any) => RuleConnectionActions.IDelRuleConnectionFulfilled;
  delRuleConnectionRejected: (error: Error) => RuleConnectionActions.IDelRuleConnectionRejected;
  checkIfRuleShouldRun: (
    lastUpdatedComponentId: string,
    lastUpdatedDataBinding: IDataModelFieldElement,
    lastUpdatedDataValue: string,
    repeating: boolean,
    dataModelGroup?: string,
    index?: number
  ) => RuleConnectionActions.ICheckIfRuleShouldRun;
}

const actions: IRuleConnectionActionDispatchers = {
  addRuleConnection: RuleConnectionActions.addRuleConnection,
  addRuleConnectionFulfilled: RuleConnectionActions.addRuleConnectionFulfilled,
  addRuleConnectionRejected: RuleConnectionActions.addRuleConnectionRejected,
  delRuleConnection: RuleConnectionActions.delRuleConnection,
  delRuleConnectionFulfilled: RuleConnectionActions.delRuleConnectionFulfilled,
  delRuleConnectionRejected: RuleConnectionActions.delRuleConnectionRejected,
  checkIfRuleShouldRun: RuleConnectionActions.checkIfRuleShouldRun,
};

const RuleConnectionActionDispatchers: IRuleConnectionActionDispatchers = bindActionCreators<
  any,
  IRuleConnectionActionDispatchers
  >(actions, store.dispatch);

export default RuleConnectionActionDispatchers;
