import update, { extend } from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as actionTypes from '../actions/types';
import {
  IFetchFormDataFulfilled,
  IFetchFormDataRejected,
} from '../actions/fetch';
import {
  ISubmitFormDataRejected,
} from '../actions/submit';
import {
  IUpdateFormDataFulfilled,
  IUpdateFormDataRejected,
} from '../actions/update';

export interface IFormData {
  [dataFieldKey: string]: any;
}

export interface IFormDataState {
  formData: IFormData;
  error: Error;
}

const initialState: IFormDataState = {
  formData: {},
  error: null,
};

extend('$setField', (params: any, original: IFormData) => {
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
      return update<IFormDataState>(state, {
        formData: {
          $merge: formData,
        }
      });
    }
    case actionTypes.FETCH_FORM_DATA_REJECTED: {
      const { error } = action as IFetchFormDataRejected;
      return update<IFormDataState>(state, {
        error: {
          $set: error,
        },
      });
    }
    case actionTypes.UPDATE_FORM_DATA_FULFILLED: {
      const { field, data } = action as IUpdateFormDataFulfilled;
      return update<IFormDataState>(state, {
        formData: {
          $setField: {
            field,
            data,
          },
        },
      });
    };
    case actionTypes.UPDATE_FORM_DATA_REJECTED: {
      const { error } = action as IUpdateFormDataRejected;
      return update<IFormDataState>(state, {
        error: {
          $set: error,
        },
      });
    }
    case actionTypes.SUBMIT_FORM_DATA_REJECTED: {
      const { error } = action as ISubmitFormDataRejected;
      return update<IFormDataState>(state, {
        error: {
          $set: error,
        },
      });
    }
    default: {
      return state;
    }
  }
}

export default FormDataReducer;