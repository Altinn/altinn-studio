import { Action } from 'redux';
import { IComponentValidations } from '../../../../../types/global';
import * as ActionTypes from '../types';

export interface IUpdateComponentValidations extends Action {
  validations: IComponentValidations;
  componentId: string;
}

export interface IUpdateComponentValidationsRejected extends Action {
  error: Error;
}

export function updateComponentValidations(
  validations: IComponentValidations, componentId: string): IUpdateComponentValidations {
  return {
    type: ActionTypes.UPDATE_COMPONENT_VALIDATIONS,
    validations,
    componentId,
  };
}

export function updateComponentValidationsFulfilled(): Action {
  return {
    type: ActionTypes.UPDATE_COMPONENT_VALIDATIONS_FULFILLED,
  };
}

export function updateComponentValidationsRejected(error: Error): IUpdateComponentValidationsRejected {
  return {
    type: ActionTypes.UPDATE_COMPONENT_VALIDATIONS_REJECTED,
    error,
  };
}
