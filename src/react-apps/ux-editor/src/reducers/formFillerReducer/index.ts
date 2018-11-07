import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as FormFillerActions from '../../actions/formFillerActions/actions';
import * as FormFillerActionTypes from '../../actions/formFillerActions/formFillerActionTypes';

export interface IFormFillerState {
  formData: any;
  validationErrors: any;
  unsavedChanges: boolean;
}

const initialState: IFormFillerState = {
  formData: {},
  validationErrors: {},
  unsavedChanges: false,
};

const formFillerReducer: Reducer<IFormFillerState> = (
  state: IFormFillerState = initialState,
  action?: Action,
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
        dataModelBinding,
        validationErrors,
      } = action as FormFillerActions.IUpdateFormDataActionFulfilled;
      if (validationErrors && validationErrors.length > 0) {
        return update<IFormFillerState>(state, {
          formData: {
            $apply: () => ({
              ...state.formData,
              [dataModelBinding]: formData,
            }),
          },
          validationErrors: {
            [componentID]: {
              $set: validationErrors,
            },
          },
          unsavedChanges: {
            $set: true,
          },
        });
      }

      return update<IFormFillerState>(state, {
        formData: {
          $apply: () => ({
            ...state.formData,
            [dataModelBinding]: formData,
          }),
        },
        validationErrors: {
          $unset: [componentID],
        },
        unsavedChanges: {
          $set: true,
        },
      });
    }

    case (FormFillerActionTypes.FETCH_FORM_DATA_FULFILLED): {
      const { formData } = action as FormFillerActions.IFetchFormDataActionFulfilled;
      return update<IFormFillerState>(state, {
        formData: {
          $set: formData,
        },
        unsavedChanges: {
          $set: false,
        },
      });
    }

    case (FormFillerActionTypes.SUBMIT_FORM_DATA_FULFILLED): {
      return update<IFormFillerState>(state, {
        unsavedChanges: {
          $set: false,
        },
      });
    }

    default:
      return state;
  }
};

export default formFillerReducer;
