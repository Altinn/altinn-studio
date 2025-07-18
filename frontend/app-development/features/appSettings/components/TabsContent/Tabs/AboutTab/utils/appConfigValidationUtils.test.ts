import { validateAppConfig } from './appConfigValidationUtils';
import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';
import type { AppConfigNew } from 'app-shared/types/AppConfig';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('appConfigValidationUtils', () => {
  describe('validateAppConfig', () => {
    it('returns empty array if appConfig is undefined', () => {
      const result: AppConfigFormError[] = validateAppConfig(undefined, textMock);
      expect(result).toEqual([]);
    });

    it('returns no errors if all serviceName translations are present', () => {
      const result = validateAppConfig(appConfigComplete, textMock);
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

const appConfigComplete: AppConfigNew = {
  resourceType: 'altinnapp',
  repositoryName: 'test-repo',
  serviceId: 'id',
  serviceName: {
    nb: 'Tjeneste',
    nn: 'Teneste',
    en: 'Service',
  },
  description: {
    nb: 'Beskrivelse',
    nn: 'Skildring',
    en: 'Description',
  },
  isDelegable: true,
  rightDescription: {
    nb: 'test rd nb',
    nn: 'test rd nn',
    en: 'test rd en',
  },
  status: 'UnderDevelopment',
  availableForType: ['PrivatePerson'],
};
