import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IValidations } from '../../../../types/global';
import { IUpdateComponentValidations } from '../actions/componentValidations';
import { IRunSingleFieldValidationActionFulfilled } from '../actions/singleFieldValidation';
import * as ActionTypes from '../actions/types';
import { IUpdateValidations } from '../actions/validations';

export interface IValidationState {
  validations: IValidations;
  error: Error;
}

const initialValidationState: IValidationState = {
  validations: {},
  error: null,
};

const ValidationReducer: Reducer<IValidationState> = (
  state: IValidationState = initialValidationState,
  action?: Action,
): IValidationState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case ActionTypes.UPDATE_COMPONENT_VALIDATIONS: {
      const { validations, componentId } = action as IUpdateComponentValidations;
      return update<IValidationState>(state, {
        validations: {
          [componentId]: {
            $set: validations,
          },
        },
      });
    }
    case ActionTypes.UPDATE_VALIDATIONS:
    case ActionTypes.RUN_SINGLE_FIELD_VALIDATION_FULFILLED: {
      const { validations } = action as IUpdateValidations | IRunSingleFieldValidationActionFulfilled;
      return update<IValidationState>(state, {
        $set: {
          validations,
        },
      });
    }
    default: {
      return state;
    }
  }
};

export default ValidationReducer;
