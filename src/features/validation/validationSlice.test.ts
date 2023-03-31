import { initialState, ValidationActions, validationSlice } from 'src/features/validation/validationSlice';
import type { IValidationState } from 'src/features/validation/validationSlice';
import type { IComponentValidations, IValidations } from 'src/types';

describe('validationSlice', () => {
  let state: IValidationState;
  let mockValidations: IValidations;
  let mockError: Error;

  const slice = validationSlice();

  beforeEach(() => {
    state = initialState;
    mockValidations = {
      formLayout: {
        mockComponent: {
          simpleBinding: {
            errors: ['Error message'],
            warnings: [],
          },
        },
      },
    };
    mockError = new Error('Something went wrong');
  });

  it('handles runSingleFieldValidationFulfilled action', () => {
    const nextState = slice.reducer(
      state,
      ValidationActions.runSingleFieldValidationFulfilled({
        validations: mockValidations,
      }),
    );
    expect(nextState.validations).toEqual(mockValidations);
  });

  it('handles runSingleFieldValidationRejected action', () => {
    const nextState = slice.reducer(state, ValidationActions.runSingleFieldValidationRejected({ error: mockError }));
    expect(nextState.error).toEqual(mockError);
  });

  it('handles updateComponentValidations action', () => {
    const componentValidations: IComponentValidations = {
      simpleBinding: {
        errors: ['Something went wrong...'],
        warnings: ['Warning'],
      },
    };
    const componentId = 'testComponent';
    const invalidDataTypes: string[] = [componentId];
    const nextState = slice.reducer(
      {
        ...initialState,
        validations: mockValidations,
      },
      ValidationActions.updateComponentValidations({
        layoutId: 'formLayout',
        componentId,
        validations: componentValidations,
        invalidDataTypes,
      }),
    );
    const expectedValidations: IValidations = {
      formLayout: {
        ...mockValidations.formLayout,
        [componentId]: componentValidations,
      },
    };

    expect(nextState.validations).toEqual(expectedValidations);
    expect(nextState.invalidDataTypes).toEqual(invalidDataTypes);
  });

  it('handles updateValidations action', () => {
    const nextState = slice.reducer(
      state,
      ValidationActions.updateValidations({
        validations: mockValidations,
      }),
    );
    expect(nextState.validations).toEqual(mockValidations);
  });
});
