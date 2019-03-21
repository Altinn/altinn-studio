import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../../../store';

import * as RuleActions from './rule';

export interface IFormRulesActions extends ActionCreatorsMapObject {
  checkIfRuleShouldRun: (
    lastUpdatedComponentId: string,
    lastUpdatedDataField: string,
    lastUpdatedData: string,
    repeatingContainerId?: string,
  ) => RuleActions.ICheckIfRuleShouldRun;
}

const actions: IFormRulesActions = {
  checkIfRuleShouldRun: RuleActions.checkIfRuleShouldRun,
};

const FormRulesActions: IFormRulesActions = bindActionCreators<any, any>(actions, store.dispatch);

export default FormRulesActions;