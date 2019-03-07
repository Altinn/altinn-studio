import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as RuleConnectionActions from './actions';

export interface IRuleConnectionActionDispatchers extends ActionCreatorsMapObject {
  checkIfRuleShouldRun: (
    lastUpdatedComponentId: string,
    lastUpdatedDataBinding: IDataModelFieldElement,
    lastUpdatedDataValue: string,
    repeatingContainerId?: string,
  ) => RuleConnectionActions.ICheckIfRuleShouldRun;
}

const actions: IRuleConnectionActionDispatchers = {
  checkIfRuleShouldRun: RuleConnectionActions.checkIfRuleShouldRun,
};

const RuleConnectionActionDispatchers: IRuleConnectionActionDispatchers = bindActionCreators<
  any,
  IRuleConnectionActionDispatchers
>(actions, store.dispatch);

export default RuleConnectionActionDispatchers;
