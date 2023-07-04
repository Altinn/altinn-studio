import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { makeGetHasErrorsSelector } from 'src/selectors/getErrors';
import type { IFormDataState } from 'src/features/formData';

describe('selectors > getErrors', () => {
  it('should return true if error is present', () => {
    const initialState = getInitialStateMock({
      formData: {
        error: new Error('mock'),
      } as IFormDataState,
    });
    const getError = makeGetHasErrorsSelector();
    const result = getError(initialState);
    expect(result).toEqual(true);
  });

  it('should return false if a formDataError is from a 403', () => {
    const initialState = getInitialStateMock({
      formData: {
        error: new Error('403'),
      } as IFormDataState,
    });
    const getError = makeGetHasErrorsSelector();
    const result = getError(initialState);
    expect(result).toEqual(false);
  });

  it('should return true if a formDataError is not from a 403', () => {
    const initialState = getInitialStateMock({
      formData: {
        error: new Error('500'),
      } as IFormDataState,
    });
    const getError = makeGetHasErrorsSelector();
    const result = getError(initialState);
    expect(result).toEqual(true);
  });
});
