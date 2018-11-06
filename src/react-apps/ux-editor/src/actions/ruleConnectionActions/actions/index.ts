import { Action } from 'redux';
import * as ActionTypes from '../ruleConnectionActionTypes';

export interface IAddRuleConnection extends Action {
  newConnection: any;
}

export interface IAddRuleConnectionFulfilled extends Action {
  newConnection: any;
}

export interface IAddRuleConnectionRejected extends Action {
  error: Error;
}

export function addRuleConnection(newConnection: any): IAddRuleConnection {
  return {
    type: ActionTypes.ADD_RULE_CONNECTION,
    newConnection,
  };
}

export function addRuleConnectionFulfilled(newConnection: any): IAddRuleConnectionFulfilled {
  return {
    type: ActionTypes.ADD_RULE_CONNECTION_FULFILLED,
    newConnection,
  };
}

export function addRuleConnectionRejected(error: Error): IAddRuleConnectionRejected {
  return {
    type: ActionTypes.ADD_RULE_CONNECTION_REJECTED,
    error,
  };
}

export interface IDelRuleConnection extends Action {
  connectionId: any;
}

export interface IDelRuleConnectionFulfilled extends Action {
  newConnectionObj: any;
}

export interface IDelRuleConnectionRejected extends Action {
  error: Error;
}

export function delRuleConnection(connectionId: any): IDelRuleConnection {
  return {
    type: ActionTypes.DEL_RULE_CONNECTION,
    connectionId,
  };
}

export function delRuleConnectionFulfilled(newConnectionObj: any): IDelRuleConnectionFulfilled {
  return {
    type: ActionTypes.DEL_RULE_CONNECTION_FULFILLED,
    newConnectionObj,
  };
}

export function delRuleConnectionRejected(error: Error): IDelRuleConnectionRejected {
  return {
    type: ActionTypes.DEL_RULE_CONNECTION_REJECTED,
    error,
  };
}

export interface ICheckIfRuleShouldRun extends Action {
  lastUpdatedComponentId: string;
  lastUpdatedDataBinding: IDataModelFieldElement;
  lastUpdatedDataValue: string;
  repeating: boolean;
  dataModelGroup?: string;
  index?: number;
}

export function checkIfRuleShouldRun(
  lastUpdatedComponentId: string,
  lastUpdatedDataBinding: IDataModelFieldElement,
  lastUpdatedDataValue: string,
  repeating: boolean,
  dataModelGroup?: string,
  index?: number,
): ICheckIfRuleShouldRun {
  return {
    type: ActionTypes.CHECK_IF_RULE_SHOULD_RUN,
    lastUpdatedComponentId,
    lastUpdatedDataBinding,
    lastUpdatedDataValue,
    repeating,
    dataModelGroup,
    index,
  };
}
