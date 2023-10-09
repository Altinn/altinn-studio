import { createSagaSlice } from 'src/redux/sagaSlice';
import type { ICustomValidationState } from 'src/features/customValidation/types';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';
import type { IExpressionValidations } from 'src/utils/validation/types';

const initialState: ICustomValidationState = {
  customValidation: null,
  error: null,
};

export let CustomValidationActions: ActionsFromSlice<typeof customValidationSlice>;
export const customValidationSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<ICustomValidationState>) => ({
    name: 'customValidation',
    initialState,
    actions: {
      fetchCustomValidationsFulfilled: mkAction<IExpressionValidations | null>({
        reducer: (state, action) => {
          state.customValidation = action.payload;
          state.error = null;
        },
      }),
      fetchCustomValidationsRejected: mkAction<Error | null>({
        reducer: (state, action) => {
          state.customValidation = null;
          state.error = action.payload;
        },
      }),
    },
  }));
  CustomValidationActions = slice.actions;
  return slice;
};
