import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as ConditionalRenderingActions from './actions';

export interface IConditionalRenderingActionDispatcher extends ActionCreatorsMapObject {
  addConditionalRendering: (newConnction: any) => ConditionalRenderingActions.IAddConditionalRendering;
  addConditionalRenderingFulfilled: (newConnection: any) => ConditionalRenderingActions.IAddConditionalRenderingFulfilled;
  addConditionalRenderingRejected: (error: Error) => ConditionalRenderingActions.IAddConditionalRenderingRejected;
  delConditionalRendering: (connectionId: any) => ConditionalRenderingActions.IDelConditionalRendering;
  delConditionalRenderingFulfilled: (newConnectionObj: any) => ConditionalRenderingActions.IDelConditionalRenderingFulfilled;
  delConditionalRenderingRejected: (error: Error) => ConditionalRenderingActions.IDelConditionalRenderingRejected;
  checkIfConditionalRulesShouldRun: (repeatingContainerId?: string) => ConditionalRenderingActions.ICheckIfConditionalRulesShouldRun;
}

const actions: IConditionalRenderingActionDispatcher = {
  addConditionalRendering: ConditionalRenderingActions.addConditionalRendering,
  addConditionalRenderingFulfilled: ConditionalRenderingActions.addRuleConnectionFulfilled,
  addConditionalRenderingRejected: ConditionalRenderingActions.addConditionalRenderingRejected,
  delConditionalRendering: ConditionalRenderingActions.delConditionalRendering,
  delConditionalRenderingFulfilled: ConditionalRenderingActions.delRuleConnectionFulfilled,
  delConditionalRenderingRejected: ConditionalRenderingActions.delConditionalRenderingRejected,
  checkIfConditionalRulesShouldRun: ConditionalRenderingActions.checkIfConditionalRulesShouldRun,
};

const ConditionalRenderingActionDispatcher: IConditionalRenderingActionDispatcher = bindActionCreators<
  any,
  IConditionalRenderingActionDispatcher
  >(actions, store.dispatch);

export default ConditionalRenderingActionDispatcher;
