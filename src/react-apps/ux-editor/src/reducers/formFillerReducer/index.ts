import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as FormFillerActions from '../../actions/formFillerActions/actions';
import * as FormFillerActionTypes from '../../actions/formFillerActions/formFillerActionTypes';

export interface IFormFillerState {
  formData: any;
  validationErrors: any;
}

const initialState: IFormFillerState = {
  formData: {},
  validationErrors: {}
};

const formFillerReducer: Reducer<IFormFillerState> = (
  state: IFormFillerState = initialState,
  action?: Action
): IFormFillerState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case FormFillerActionTypes.UPDATE_VALIDATIONERRORS: {
      const {
        validationErrors,
      } = action as FormFillerActions.IUpdateValidationErrors;
      return update<IFormFillerState>(state, {
        $apply: () => ({
          ...state,
          validationErrors,
        }),
      });
    }

    case FormFillerActionTypes.UPDATE_FORM_DATA_FULFILLED: {
      const {
        formData,
        componentID,
        dataModelElement,
        validationErrors,
      } = action as FormFillerActions.IUpdateFormDataActionFulfilled;
      if (validationErrors && validationErrors.length > 0) {
        return update<IFormFillerState>(state, {
          formData: {
            $apply: () => ({
              ...state.formData,
              [dataModelElement.DataBindingName]: formData,
            }),
          },
          validationErrors: {
            [componentID]: {
              $set: validationErrors,
            },
          },
        });
      }

      return update<IFormFillerState>(state, {
        formData: {
          $apply: () => ({
            ...state.formData,
            [dataModelElement.DataBindingName]: formData
          })
        },
        validationErrors: {
          $unset: [componentID]
        }
      });
    }

    case (FormFillerActionTypes.FETCH_FORM_DATA_FULFILLED): {
      const { formData } = action as FormFillerActions.IFetchFormDataActionFulfilled;
      return update<IFormFillerState>(state, {
        formData: {
          $set: formData
        }
      })
    }

    default:
      return state;
  }
};

export default formFillerReducer;
