import Immutable from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IFetchFormDataFulfilled, IFetchFormDataRejected } from './fetch/fetchFormDataActions';
import { ISubmitFormDataRejected } from './submit/submitFormDataActions';
import * as actionTypes from './formDataActionTypes';
import { IUpdateFormDataFulfilled, IUpdateFormDataRejected } from './update/updateFormDataActions';
import * as ProcessActionTypes from './../../../shared/resources/process/processActionTypes';

export interface IFormData {
  [dataFieldKey: string]: any;
}

export interface IFormDataState {
  formData: IFormData;
  error: Error;
  responseInstance: any;
  unsavedChanges: boolean;
  isSubmitting: boolean;
}

const initialState: IFormDataState = {
  formData: {},
  error: null,
  responseInstance: null,
  unsavedChanges: false,
  isSubmitting: false,
};

Immutable.extend('$setField', (params: any, original: IFormData) => {
  original[params.field] = params.data;
  return original;
});

const FormDataReducer: Reducer<IFormDataState> = (
  state: IFormDataState = initialState,
  action?: Action,
): IFormDataState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case actionTypes.FETCH_FORM_DATA_FULFILLED: {
      const { formData } = action as IFetchFormDataFulfilled;
      return Immutable<IFormDataState>(state, {
        formData: {
          $merge: formData,
        },
      });
    }
    case actionTypes.FETCH_FORM_DATA_REJECTED: {
      const { error } = action as IFetchFormDataRejected;
      return Immutable<IFormDataState>(state, {
        error: {
          $set: error,
        },
      });
    }
    case actionTypes.UPDATE_FORM_DATA_FULFILLED: {
      const { field, data } = action as IUpdateFormDataFulfilled;
      if (!data || data === '') {
        return Immutable<IFormDataState>(state, {
          formData: {
            $unset: [field],
          },
        });
      }
      return Immutable<IFormDataState>(state, {
        formData: {
          $setField: {
            field,
            data,
          },
        },
        unsavedChanges: {
          $set: true,
        },
      });
    }

    case actionTypes.UPDATE_FORM_DATA_REJECTED: {
      const { error } = action as IUpdateFormDataRejected;
      return Immutable<IFormDataState>(state, {
        error: {
          $set: error,
        },
      });
    }
    case actionTypes.SUBMIT_FORM_DATA_REJECTED: {
      const { error } = action as ISubmitFormDataRejected;
      return Immutable<IFormDataState>(state, {
        error: {
          $set: error,
        },
        isSubmitting: {
          $set: false,
        }
      });
    }

    case actionTypes.SUBMIT_FORM_DATA_FULFILLED: {
      return Immutable<IFormDataState>(state, {
        unsavedChanges: {
          $set: false,
        },
      });
    }

    case actionTypes.SUBMIT_FORM_DATA: {
      return Immutable<IFormDataState>(state, {
        isSubmitting: {
          $set: true,
        },
      });
    }

    case ProcessActionTypes.COMPLETE_PROCESS_FULFILLED:
    case ProcessActionTypes.COMPLETE_PROCESS_REJECTED: {
      return Immutable<IFormDataState>(state, {
        isSubmitting: {
          $set: false,
        },
      });
    }
    
    default: {
      return state;
    }
  }
};

export default FormDataReducer;
