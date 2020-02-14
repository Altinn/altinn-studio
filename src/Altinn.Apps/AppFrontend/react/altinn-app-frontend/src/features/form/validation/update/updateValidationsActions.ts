import { Action } from 'redux';
import { IValidations } from '../../../../types/global';
import * as ActionTypes from '../validationActionTypes';

export interface IUpdateValidations extends Action {
  validations: IValidations;
}

export interface IUpdateValidationsRejected extends Action {
  error: Error;
}

export function updateValidations(validations: IValidations): IUpdateValidations {
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
