import { Action } from 'redux';
import { IComponentValidations } from 'src/types';
import * as ActionTypes from '../validationActionTypes';

export interface IUpdateComponentValidations extends Action {
  validations: IComponentValidations;
  componentId: string;
  invalidDataTypes?: string[];
}

export interface IUpdateComponentValidationsRejected extends Action {
  error: Error;
}

export function updateComponentValidations(
  validations: IComponentValidations,
  componentId: string,
  invalidDataTypes?: string[],
): IUpdateComponentValidations {
  return {
    type: ActionTypes.UPDATE_COMPONENT_VALIDATIONS,
    validations,
    componentId,
    invalidDataTypes,
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
