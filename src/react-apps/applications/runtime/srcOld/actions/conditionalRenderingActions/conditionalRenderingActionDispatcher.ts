import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as ConditionalRenderingActions from './actions';

export interface IConditionalRenderingActionDispatcher extends ActionCreatorsMapObject {
  checkIfConditionalRulesShouldRun: (repeatingContainerId?: string) =>
    ConditionalRenderingActions.ICheckIfConditionalRulesShouldRun;
}

const actions: IConditionalRenderingActionDispatcher = {
  checkIfConditionalRulesShouldRun: ConditionalRenderingActions.checkIfConditionalRulesShouldRun,
};

const ConditionalRenderingActionDispatcher: IConditionalRenderingActionDispatcher = bindActionCreators<
  any,
  IConditionalRenderingActionDispatcher
>(actions, store.dispatch);

export default ConditionalRenderingActionDispatcher;
