import type {
  IComponentValidations,
  ICurrentSingleFieldValidation,
  IValidations,
} from '../../../types';

import type { IValidationState } from './validationSlice';
import slice, { initialState, ValidationActions } from './validationSlice';

describe('validationSlice', () => {
  let state: IValidationState;
  let mockValidations: IValidations;
  let mockError: Error;
  let mockSingleFieldValidationField: ICurrentSingleFieldValidation;

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
    mockSingleFieldValidationField = {
      dataModelBinding: 'mockField',
      componentId: 'mockComponent',
      layoutId: 'formLayout',
    };
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
    const nextState = slice.reducer(
      state,
      ValidationActions.runSingleFieldValidationRejected({ error: mockError }),
    );
    expect(nextState.error).toEqual(mockError);
  });

  it('handles setCurrentSingleFieldValidation action', () => {
    const nextState = slice.reducer(
      state,
      ValidationActions.setCurrentSingleFieldValidation({
        ...mockSingleFieldValidationField,
      }),
    );
    expect(nextState.currentSingleFieldValidation).toEqual(
      mockSingleFieldValidationField,
    );
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
