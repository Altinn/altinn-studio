import { IFormDataState } from '../../src/features/form/data/formDataReducer';
import { makeGetHasErrorsSelector } from '../../src/selectors/getErrors';
import { getInitialStateMock } from '../../__mocks__/initialStateMock';

describe('selectors > getErrors', () => {
  it('getHasErrors should return true if error is present', () => {
    const initialState = getInitialStateMock({
      formData: {
        error: new Error('mock'),
      } as IFormDataState,
    });
    const getError = makeGetHasErrorsSelector();
    const result = getError(initialState);
    expect(result).toEqual(true);
  });

  it('getHasErrors should return false if applicationSettingsError is from a 404', () => {
    const initialState = getInitialStateMock({
      applicationSettings: {
        error: new Error('404'),
        applicationSettings: undefined,
      },
    });
    const getError = makeGetHasErrorsSelector();
    const result = getError(initialState);
    expect(result).toEqual(false);
  });
});
