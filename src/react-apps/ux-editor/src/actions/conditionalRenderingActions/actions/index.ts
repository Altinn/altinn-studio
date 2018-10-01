import { Action } from 'redux';
import * as ActionTypes from '../conditionalRenderingActionTypes';

export interface IAddConditionalRendering extends Action {
  newConnection: any;
}

export interface IAddConditionalRenderingFulfilled extends Action {
  newConnection: any;
}

export interface IAddConditionalRenderingRejected extends Action {
  error: Error;
}

export function addConditionalRendering(newConnection: any): IAddConditionalRendering {
  return {
    type: ActionTypes.ADD_CONDITIONAL_RENDERING,
    newConnection,
  };
}

export function addRuleConnectionFulfilled(newConnection: any): IAddConditionalRenderingFulfilled {
  return {
    type: ActionTypes.ADD_CONDITIONAL_RENDERING_FULFILLED,
    newConnection,
  };
}

export function addConditionalRenderingRejected(error: Error): IAddConditionalRenderingRejected {
  return {
    type: ActionTypes.ADD_CONDITIONAL_RENDERING_REJECTED,
    error,
  };
}

export interface IDelConditionalRendering extends Action {
  connectionId: any;
}

export interface IDelConditionalRenderingFulfilled extends Action {
  newConnectionObj: any;
}

export interface IDelConditionalRenderingRejected extends Action {
  error: Error;
}

export function delConditionalRendering(connectionId: any): IDelConditionalRendering {
  return {
    type: ActionTypes.DEL_CONDITIONAL_RENDERING,
    connectionId,
  };
}

export function delRuleConnectionFulfilled(newConnectionObj: any): IDelConditionalRenderingFulfilled {
  return {
    type: ActionTypes.DEL_CONDITIONAL_RENDERING_FULFILLED,
    newConnectionObj,
  };
}

export function delConditionalRenderingRejected(error: Error): IDelConditionalRenderingRejected {
  return {
    type: ActionTypes.DEL_CONDITIONAL_RENDERING_REJECTED,
    error,
  };
}

export interface ICheckIfConditionalRulesShouldRun extends Action {

}

export function checkIfConditionalRulesShouldRun(): ICheckIfConditionalRulesShouldRun {
  return {
    type: ActionTypes.CHECK_IF_CONDITIONAL_RULE_SHOULD_RUN,
  };
}
