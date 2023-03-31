import { runSingleFieldValidationSaga } from 'src/features/validation/singleFieldValidationSagas';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';
import type { IComponentValidations, IValidations } from 'src/types';

export interface IValidationState {
  validations: IValidations;
  invalidDataTypes: string[];
  error: Error | null;
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

export interface IRunSingleFieldValidation {
  dataModelBinding: string;
  componentId: string;
  layoutId: string;
}

export interface IValidationActionRejected {
  error?: Error;
}

export const initialState: IValidationState = {
  validations: {},
  error: null,
  invalidDataTypes: [],
};

export let ValidationActions: ActionsFromSlice<typeof validationSlice>;
export const validationSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IValidationState>) => ({
    name: 'formValidations',
    initialState,
    actions: {
      runSingleFieldValidation: mkAction<IRunSingleFieldValidation>({
        takeLatest: runSingleFieldValidationSaga,
      }),
      runSingleFieldValidationFulfilled: mkAction<IUpdateValidations>({
        reducer: (state, action) => {
          const { validations } = action.payload;
          state.validations = validations;
        },
      }),
      runSingleFieldValidationRejected: mkAction<IValidationActionRejected>({
        reducer: (state, action) => {
          if (action.payload.error) {
            const { error } = action.payload;
            state.error = error;
          }
        },
      }),
      updateComponentValidations: mkAction<IUpdateComponentValidations>({
        reducer: (state, action) => {
          const { layoutId, validations, componentId, invalidDataTypes } = action.payload;

          if (!state.validations[layoutId]) {
            state.validations[layoutId] = {};
          }

          state.validations[layoutId][componentId] = validations;
          state.invalidDataTypes = invalidDataTypes || [];
        },
      }),
      updateValidations: mkAction<IUpdateValidations>({
        reducer: (state, action) => {
          const { validations } = action.payload;
          state.validations = validations;
        },
      }),
    },
  }));

  ValidationActions = slice.actions;
  return slice;
};
