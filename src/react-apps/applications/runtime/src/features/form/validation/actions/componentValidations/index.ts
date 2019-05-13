import { Action } from 'redux';
import { IComponentValidations } from '../../../../../types/global';
import * as ActionTypes from '../types';

export interface IUpdateValidations extends Action {
  validations: IComponentValidations;
}

export interface IUpdateValidationsRejected extends Action {
  error: Error;
}

export function updateValidations(validations: IComponentValidations): IUpdateValidations {
  return {
    type: ActionTypes.UPDATE_VALIDATIONS,
    validations,
  };
}

export function updateValidationsFulfilled(): Action {
  return {
    type: ActionTypes.UPDATE_VALIDATIONS_FULFILLED,
  };
}

export function updateValidationsRejected(error: Error): IUpdateValidationsRejected {
  return {
    type: ActionTypes.UPDATE_VALIDATIONS_REJECTED,
    error,
  };
}
