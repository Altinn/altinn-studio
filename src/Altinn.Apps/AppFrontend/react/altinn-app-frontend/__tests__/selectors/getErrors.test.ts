import { IFormDynamicState } from 'src/features/form/dynamics';
import { IFormRuleState } from 'src/features/form/rules/rulesReducer';
import { ITextResourcesState } from 'src/shared/resources/textResources/textResourcesReducer';
import { IFormDataState } from '../../src/features/form/data/formDataReducer';
import { makeGetHasErrorsSelector } from '../../src/selectors/getErrors';
import { getInitialStateMock } from '../../__mocks__/initialStateMock';

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

  it('should return false if applicationSettingsError is from a 404', () => {
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

  it('should return true if applicationSettingsError is not from a 404', () => {
    const initialState = getInitialStateMock({
      applicationSettings: {
        error: new Error('500'),
        applicationSettings: undefined,
      },
    });
    const getError = makeGetHasErrorsSelector();
    const result = getError(initialState);
    expect(result).toEqual(true);
  });

  it('should return false if formRulesError is from a 404', () => {
    const initialState = getInitialStateMock({
      formRules: {
        error: new Error('404'),
      } as IFormRuleState,
    });
    const getError = makeGetHasErrorsSelector();
    const result = getError(initialState);
    expect(result).toEqual(false);
  });

  it('should return true if formRulesError is not from a 404', () => {
    const initialState = getInitialStateMock({
      formRules: {
        error: new Error('500'),
      } as IFormRuleState,
    });
    const getError = makeGetHasErrorsSelector();
    const result = getError(initialState);
    expect(result).toEqual(true);
  });

  it('should return false if formDynamicsError is from a 404', () => {
    const initialState = getInitialStateMock({
      formDynamics: {
        error: new Error('404'),
      } as IFormDynamicState,
    });
    const getError = makeGetHasErrorsSelector();
    const result = getError(initialState);
    expect(result).toEqual(false);
  });

  it('should return true if formDynamicsError is not from a 404', () => {
    const initialState = getInitialStateMock({
      formDynamics: {
        error: new Error('500'),
      } as IFormDynamicState,
    });
    const getError = makeGetHasErrorsSelector();
    const result = getError(initialState);
    expect(result).toEqual(true);
  });

  it('should return false if textResourcesError is from a 404', () => {
    const initialState = getInitialStateMock({
      textResources: {
        error: new Error('404'),
      } as ITextResourcesState,
    });
    const getError = makeGetHasErrorsSelector();
    const result = getError(initialState);
    expect(result).toEqual(false);
  });

  it('should return true if textResourcesError is not from a 404', () => {
    const initialState = getInitialStateMock({
      textResources: {
        error: new Error('500'),
      } as ITextResourcesState,
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
