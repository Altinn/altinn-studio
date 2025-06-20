import { getMissingInputLanguageString, validateAppConfig } from './appConfigValidationUtils';
import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';
import type { AppConfigNew } from 'app-shared/types/AppConfig';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('appConfigValidationUtils', () => {
  describe('getMissingInputLanguageString', () => {
    it('returns empty string when no languages are missing', () => {
      const result: string = getMissingInputLanguageString(
        { nb: 't1', nn: 't2', en: 't3' },
        'usage',
        textMock,
      );
      expect(result).toBe('');
    });

    it('returns single missing language message', () => {
      const result: string = getMissingInputLanguageString(
        { nb: 'value', nn: '', en: 'value' },
        'usage',
        textMock,
      );
      expect(result).toContain('app_settings.about_tab_language_error_missing_1');
    });

    it('returns multiple missing languages message', () => {
      const result: string = getMissingInputLanguageString(
        { nb: '', nn: '', en: '' },
        'usage',
        textMock,
      );
      expect(result).toContain('app_settings.about_tab_language_error_missing_2');
    });
  });

  describe('validateAppConfig', () => {
    it('returns empty array if appConfig is undefined', () => {
      const result: AppConfigFormError[] = validateAppConfig(undefined, textMock);
      expect(result).toEqual([]);
    });

    it('returns no errors if all serviceName translations are present', () => {
      const appConfig: AppConfigNew = {
        serviceName: {
          nb: 'Tjeneste',
          nn: 'Teneste',
          en: 'Service',
        },
      } as AppConfigNew;

      const result = validateAppConfig(appConfig, textMock);
      expect(result).toHaveLength(0);
    });

    it('returns missing translation errors for nn and en if those fields are empty', () => {
      const appConfig: AppConfigNew = {
        serviceName: {
          nb: 'Tjeneste',
        },
      } as AppConfigNew;

      const result: AppConfigFormError[] = validateAppConfig(appConfig, textMock);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'serviceName',
            index: 'nn',
            error: expect.stringContaining('app_settings.about_tab_error_translation_missing_nn'),
          }),
          expect.objectContaining({
            field: 'serviceName',
            index: 'en',
            error: expect.stringContaining('app_settings.about_tab_error_translation_missing_en'),
          }),
        ]),
      );
    });
  });
});
