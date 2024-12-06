import { renderHook } from '@testing-library/react';
import { useCreateAppFormValidation } from './useCreateAppFormValidation';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('useCreateAppFormValidation', () => {
  describe('validateRepoName', () => {
    it.each(['', undefined])(
      'should return cannot be empty error when input is %p',
      (inputValue) => {
        const {
          result: { current },
        } = renderHook(() => useCreateAppFormValidation());

        expect(current.validateRepoName(inputValue)).toEqual({
          errorMessage: textMock('dashboard.field_cannot_be_empty'),
          isValid: false,
        });
      },
    );

    it.each([' ', '-appName', '01appName', 'AppName'])(
      'should return illegal characters error message when input is %p',
      (inputValue) => {
        const {
          result: { current },
        } = renderHook(() => useCreateAppFormValidation());

        expect(current.validateRepoName(inputValue)).toEqual({
          errorMessage: textMock('dashboard.service_name_has_illegal_characters'),
          isValid: false,
        });
      },
    );

    it('should return service name to long', () => {
      const {
        result: { current },
      } = renderHook(() => useCreateAppFormValidation());

      expect(
        current.validateRepoName('to-long-service-name-goes-here-and-should-display-error'),
      ).toEqual({
        errorMessage: textMock('dashboard.service_name_is_too_long'),
        isValid: false,
      });
    });

    it.each(['appname', 'appname-test'])(
      'should return no errors and isValid true when input is valid',
      (inputValue) => {
        const {
          result: { current },
        } = renderHook(() => useCreateAppFormValidation());

        expect(current.validateRepoName(inputValue)).toEqual({
          errorMessage: null,
          isValid: true,
        });
      },
    );
  });

  describe('validateRepoOwnerName', () => {
    it.each(['', undefined])('should return error when repoOwnerName is %p', (inputValue) => {
      const {
        result: { current },
      } = renderHook(() => useCreateAppFormValidation());
      expect(current.validateRepoOwnerName(inputValue)).toEqual({
        errorMessage: textMock('dashboard.field_cannot_be_empty'),
        isValid: false,
      });
    });

    it('should return valid if repoOwnerName has value', () => {
      const {
        result: { current },
      } = renderHook(() => useCreateAppFormValidation());
      expect(current.validateRepoOwnerName('myOrg')).toEqual({
        errorMessage: null,
        isValid: true,
      });
    });
  });
});
