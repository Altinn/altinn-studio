import {
  mapLanguageKeyToLanguageText,
  getErrorMessagesForLanguage,
} from './appConfigLanguageUtils';
import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';
import type { ValidLanguage } from 'app-shared/types/SupportedLanguages';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('appConfigLanguageUtils', () => {
  describe('mapLanguageKeyToLanguageText', () => {
    it.each<ValidLanguage>(['nb', 'nn', 'en'])('returns translation key for %s', (lang) => {
      const result = mapLanguageKeyToLanguageText(lang, textMock);
      expect(result).toBe(textMock(`language.${lang}`));
    });

    it('defaults to "language.en" if language is not nb or nn', () => {
      const result = mapLanguageKeyToLanguageText('en', textMock);
      expect(result).toBe(textMock('language.en'));
    });
  });

  describe('getErrorMessagesForLanguage', () => {
    const errors: AppConfigFormError[] = [
      { field: 'serviceName', index: 'nb', error: 'Missing title' },
      { field: 'serviceName', index: 'en', error: 'Missing description' },
      { field: 'serviceId', index: 'nb', error: 'Invalid value' },
    ];

    it('returns error messages for matching language', () => {
      const result = getErrorMessagesForLanguage(errors, 'nb');
      expect(result).toEqual(['Missing title', 'Invalid value']);
    });

    it('returns undefined if no errors for the given language', () => {
      const result = getErrorMessagesForLanguage(errors, 'nn');
      expect(result).toBeUndefined();
    });

    it('returns undefined if error array is empty', () => {
      const result = getErrorMessagesForLanguage([], 'nb');
      expect(result).toBeUndefined();
    });
  });
});
