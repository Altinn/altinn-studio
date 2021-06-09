import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IComponentValidations, IValidations } from 'src/types';

export interface IValidationState {
  validations: IValidations;
  invalidDataTypes: string[];
  error: Error;
  currentSingleFieldValidation: string;
}

export interface IUpdateComponentValidations {
  layoutId: string;
  validations: IComponentValidations;
  componentId: string;
  invalidDataTypes?: string[];
}

export interface IUpdateValidations {
  validations: IValidations;
}

export interface IValidationActionRejected {
  error: Error;
}

export interface ISetCurrentSingleFieldValidationAction {
  dataModelBinding?: string;
}

export const initialState: IValidationState = {
  validations: {},
  error: null,
  invalidDataTypes: [],
  currentSingleFieldValidation: null,
};

const moduleName = 'validation';

const validationSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    runSingleFieldValidationFulfilled: (state: IValidationState, action: PayloadAction<IUpdateValidations>) => {
      const { validations } = action.payload;
      state.validations = validations;
    },
    runSingleFieldValidationRejected: (state: IValidationState, action: PayloadAction<IValidationActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    setCurrentSingleFieldValidation: (
      state: IValidationState,
      action: PayloadAction<ISetCurrentSingleFieldValidationAction>,
    ) => {
      const { dataModelBinding } = action.payload;
      state.currentSingleFieldValidation = dataModelBinding;
    },
    updateComponentValidations: (state: IValidationState, action: PayloadAction<IUpdateComponentValidations>) => {
      const {
        layoutId,
        validations,
        componentId,
        invalidDataTypes,
      } = action.payload;

      if (!state.validations[layoutId]) {
        state.validations[layoutId] = {};
      }

      state.validations[layoutId][componentId] = validations;
      state.invalidDataTypes = invalidDataTypes;
    },
    updateValidations: (state: IValidationState, action: PayloadAction<IUpdateValidations>) => {
      const { validations } = action.payload;
      state.validations = validations;
    },
  },
});

export const runSingleFieldValidation = createAction(`${moduleName}/runSingleFieldValidation`);

export const {
  runSingleFieldValidationFulfilled,
  runSingleFieldValidationRejected,
  setCurrentSingleFieldValidation,
  updateComponentValidations,
  updateValidations,
} = validationSlice.actions;

export default validationSlice.reducer;
