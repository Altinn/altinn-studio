import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IValidations } from '../../../../types/global';
import { IUpdateValidations } from '../actions/componentValidations';
import * as ActionTypes from '../actions/types';

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
    case ActionTypes.UPDATE_VALIDATIONS: {
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
