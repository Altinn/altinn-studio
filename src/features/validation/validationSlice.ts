import { runSingleFieldValidationSaga } from 'src/features/validation/singleFieldValidationSagas';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';
import type {
  IComponentBindingValidation,
  IComponentValidationResult,
  ILayoutValidationResult,
  IValidationMessage,
  IValidationObject,
  IValidationResult,
  IValidations,
} from 'src/utils/validation/types';

export interface IRunSingleFieldValidation {
  componentId: string;
  layoutId: string;
  dataModelBinding: string;
}

export interface IValidationState {
  validations: IValidations;
  invalidDataTypes: string[];
  error: Error | null;
}

export interface IUpdateComponentValidations {
  pageKey: string;
  validationResult: IComponentValidationResult;
  componentId: string;
  invalidDataTypes?: string[];
}

export interface IUpdateLayoutValidations {
  pageKey: string;
  validationResult: ILayoutValidationResult;
  merge: boolean;
}

export interface IUpdateValidations {
  validationResult: IValidationResult;
  merge: boolean;
}

export interface IAddValidations {
  validationObjects: IValidationObject[];
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
        takeEvery: runSingleFieldValidationSaga,
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
          const { pageKey, validationResult, componentId, invalidDataTypes } = action.payload;

          if (!state.validations[pageKey]) {
            state.validations[pageKey] = {};
          }

          state.validations[pageKey][componentId] = validationResult.validations;
          runFixedValidations(state, validationResult.fixedValidations ?? []);

          state.invalidDataTypes = invalidDataTypes || [];
        },
      }),
      /**
       * If merge=true, it will only update the component validations that are present in the validationResult object.
       * If merge=false, it will replace the validations for the entire layout with the ones in the validationResult object.
       */
      updateLayoutValidation: mkAction<IUpdateLayoutValidations>({
        reducer: (state, action) => {
          const { pageKey, validationResult, merge } = action.payload;
          if (merge) {
            state.validations[pageKey] = {
              ...state.validations[pageKey],
              ...validationResult.validations,
            };
          } else {
            state.validations[pageKey] = validationResult.validations;
          }
          runFixedValidations(state, validationResult.fixedValidations ?? []);
        },
      }),
      /**
       * If merge=true, it will only update the layout validations that are present in the validationResult object.
       * If merge=false, it will replace all validations with the validations in the validationResult object.
       */
      updateValidations: mkAction<IUpdateValidations>({
        reducer: (state, action) => {
          const { validationResult, merge } = action.payload;
          if (merge) {
            state.validations = {
              ...state.validations,
              ...validationResult.validations,
            };
          } else {
            state.validations = validationResult.validations;
          }
          runFixedValidations(state, validationResult.fixedValidations ?? []);
        },
      }),
      addValidations: mkAction<IAddValidations>({
        reducer: (state, action) => {
          const { validationObjects } = action.payload;
          const fixedValidation: IValidationMessage<'fixed'>[] = [];
          for (const object of validationObjects) {
            if (object.empty) {
              continue;
            }

            if (object.severity === 'fixed') {
              fixedValidation.push(object);
              continue;
            }

            const { pageKey, componentId, bindingKey, severity, message } = object;
            if (!state.validations[pageKey]) {
              state.validations[pageKey] = { [componentId]: { [bindingKey]: { [severity]: [message] } } };
              continue;
            }
            if (!state.validations[pageKey][componentId]) {
              state.validations[pageKey][componentId] = { [bindingKey]: { [severity]: [message] } };
              continue;
            }
            if (!state.validations[pageKey][componentId][bindingKey]) {
              state.validations[pageKey][componentId][bindingKey] = { [severity]: [message] };
              continue;
            }
            if (!(state.validations as any)[pageKey][componentId][bindingKey][severity]) {
              (state.validations as any)[pageKey][componentId][bindingKey][severity] = [message];
              continue;
            }
            if (!(state.validations as any)[pageKey][componentId][bindingKey][severity].includes(message)) {
              (state.validations as any)[pageKey][componentId][bindingKey][severity].push(message);
            }
          }
          runFixedValidations(state, fixedValidation);
        },
      }),
    },
  }));

  ValidationActions = slice.actions;
  return slice;
};

/**
 * Applies fiexed validations to the state. This should be run after every validation update.
 */
function runFixedValidations(state: IValidationState, fixedValidations: IValidationMessage<'fixed'>[]) {
  for (const fixed of fixedValidations) {
    const { pageKey, componentId, bindingKey } = fixed;

    let bindingValidations: IComponentBindingValidation | undefined;
    if ((bindingValidations = state.validations[pageKey]?.[componentId]?.[bindingKey])) {
      const severities = Object.keys(bindingValidations);
      for (const severity of severities) {
        bindingValidations[severity] = bindingValidations[severity].filter(
          (message: string) => message !== fixed.message,
        );
      }
    }
  }
}
