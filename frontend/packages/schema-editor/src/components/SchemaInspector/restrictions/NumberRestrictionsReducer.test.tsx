import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { NameError } from '@altinn/schema-editor/types';
import { validateMinMax } from './NumberRestrictionsReducer';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {},
});

describe('Validation for Mix and Min numbers', () => {
  test('should return no error if min is less than max', () => {
    const formatState = { min: 4, max: 7 };
    expect(validateMinMax(formatState)).toBe(NameError.NoError);
  });

  it('should return error if min is equal to the max', () => {
    const formatState = { min: 7, max: 7 };
    expect(validateMinMax(formatState)).toBe(NameError.InvalidMaxMinValue);
  });

  it('should return error message if min is greater than max', () => {
    const formatState = { min: 7, max: 4 };
    expect(validateMinMax(formatState)).toBe(NameError.InvalidMaxMinValue);
  });
});
