import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IValidations } from 'src/types';
import { IUpdateComponentValidations } from './component/componentValidationsActions';
import * as ActionTypes from './validationActionTypes';
import { IUpdateValidations } from './update/updateValidationsActions';

export interface IValidationState {
  validations: IValidations;
  invalidDataTypes: string[];
  error: Error;
}

const initialValidationState: IValidationState = {
  validations: {},
  error: null,
  invalidDataTypes: [],
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
      const {
        validations,
        componentId,
        invalidDataTypes,
      } = action as IUpdateComponentValidations;
      return update<IValidationState>(state, {
        validations: {
          [componentId]: {
            $set: validations,
          },
        },
        invalidDataTypes: {
          $set: invalidDataTypes,
        },
      });
    }
    case ActionTypes.UPDATE_VALIDATIONS:
    case ActionTypes.RUN_SINGLE_FIELD_VALIDATION_FULFILLED: {
      const { validations } = action as IUpdateValidations;
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
