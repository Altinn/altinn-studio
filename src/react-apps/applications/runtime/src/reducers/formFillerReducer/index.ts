import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as FormFillerActions from '../../actions/formFillerActions/actions';
import * as FormFillerActionTypes from '../../actions/formFillerActions/formFillerActionTypes';

export interface IFormFillerState {
  formData: any;
  validationResults: IValidationResults;
  unsavedChanges: boolean;
  apiResult?: any;
}

const initialState: IFormFillerState = {
  formData: {},
  validationResults: {},
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
    case FormFillerActionTypes.UPDATE_VALIDATIONERRORS:
    case FormFillerActionTypes.RUN_SINGLE_FIELD_VALIDATION_FULFILLED: {
      const {
        validationResults,
      } = action as FormFillerActions.IUpdateValidationResults;
      return update<IFormFillerState>(state, {
        $apply: () => ({
          ...state,
          validationResults,
        }),
      });
    }

    case FormFillerActionTypes.UPDATE_FORM_DATA_FULFILLED: {
      const {
        formData,
        componentID,
        dataModelBinding,
        validationResults,
      } = action as FormFillerActions.IUpdateFormDataActionFulfilled;
      if (validationResults && Object.keys(validationResults).length > 0) {
        return update<IFormFillerState>(state, {
          formData: {
            $apply: () => ({
              ...state.formData,
              [dataModelBinding]: formData,
            }),
          },
          validationResults: {
            [componentID]: {
              $set: validationResults,
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
        validationResults: {
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
      const { apiResult } = action as FormFillerActions.ISubmitFormDataActionFulfilled;
      return update<IFormFillerState>(state, {
        unsavedChanges: {
          $set: false,
        },
        apiResult: {
          $set: apiResult,
        },
        validationResults: {
          $set: {},
        },
      });
    }

    default:
      return state;
  }
};

export default formFillerReducer;
