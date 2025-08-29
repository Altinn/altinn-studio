import { validateAppConfig } from './appConfigValidationUtils';
import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';
import type { AppConfigNew, ContactPoint } from 'app-shared/types/AppConfig';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { APP_CONFIG_RESOURCE_TYPE } from 'app-development/features/appSettings/constants/appConfigResourceType';

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

    it('returns missing translation errors for description if nn/en are missing', () => {
      const appConfig: AppConfigNew = {
        serviceName: { nb: 'Tjeneste', nn: 'Teneste', en: 'Service' },
        description: { nb: 'Beskrivelse' }, // missing nn + en
      } as AppConfigNew;

      const result = validateAppConfig(appConfig, textMock);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'description',
            index: 'nn',
            error: expect.stringContaining('app_settings.about_tab_error_translation_missing_nn'),
          }),
          expect.objectContaining({
            field: 'description',
            index: 'en',
            error: expect.stringContaining('app_settings.about_tab_error_translation_missing_en'),
          }),
        ]),
      );
    });

    it('returns missing translation errors for rightDescription only when isDelegable is true', () => {
      const appConfig: AppConfigNew = {
        serviceName: { nb: 'Tjeneste', nn: 'Teneste', en: 'Service' },
        description: { nb: 'Beskrivelse', nn: 'Skildring', en: 'Description' },
        isDelegable: true,
        rightDescription: { nb: 'Rettighet' }, // missing nn + en
      } as AppConfigNew;

      const result = validateAppConfig(appConfig, textMock);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'rightDescription',
            index: 'nn',
            error: expect.stringContaining('app_settings.about_tab_error_translation_missing_nn'),
          }),
          expect.objectContaining({
            field: 'rightDescription',
            index: 'en',
            error: expect.stringContaining('app_settings.about_tab_error_translation_missing_en'),
          }),
        ]),
      );
    });

    it('does NOT validate rightDescription if isDelegable is false', () => {
      const appConfig: AppConfigNew = {
        serviceName: { nb: 'Tjeneste', nn: 'Teneste', en: 'Service' },
        description: { nb: 'Beskrivelse', nn: 'Skildring', en: 'Description' },
        isDelegable: false, // rightDescription not required
        status: 'UnderDevelopment',
        availableForType: ['PrivatePerson'],
      } as AppConfigNew;

      const result = validateAppConfig(appConfig, textMock);

      // Should NOT contain any rightDescription errors
      expect(result.some((err) => err.field === 'rightDescription')).toBe(false);
    });

    it('returns error for invalid status', () => {
      const appConfig: AppConfigNew = {
        ...appConfigComplete,
        status: 'NotAValidStatus' as any,
      };

      const result = validateAppConfig(appConfig, textMock);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'status',
            error: expect.stringContaining('app_settings.about_tab_status_field_error'),
          }),
        ]),
      );
    });

    it('returns error if availableForType is empty', () => {
      const appConfig: AppConfigNew = {
        ...appConfigComplete,
        availableForType: [],
      };

      const result = validateAppConfig(appConfig, textMock);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'availableForType',
            error: expect.stringContaining('app_settings.about_tab_error_available_for_type'),
          }),
        ]),
      );
    });

    it('returns error if contactPoints is missing', () => {
      const appConfig: AppConfigNew = {
        ...appConfigComplete,
        contactPoints: undefined,
      };

      const result = validateAppConfig(appConfig, textMock);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'contactPoints',
            index: 0,
            error: expect.stringContaining('app_settings.about_tab_error_contact_points'),
          }),
        ]),
      );
    });

    it('returns error if all contactPoint fields are empty', () => {
      const emptyContact: ContactPoint = {
        category: '',
        email: '',
        telephone: '',
        contactPage: '',
      };

      const appConfig: AppConfigNew = {
        ...appConfigComplete,
        contactPoints: [emptyContact],
      };

      const result = validateAppConfig(appConfig, textMock);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'contactPoints',
            index: 0,
            error: expect.stringContaining('app_settings.about_tab_error_contact_points'),
          }),
        ]),
      );
    });

    it('does NOT return error for valid contactPoint, if at least one field has content', () => {
      const appConfig: AppConfigNew = {
        ...appConfigComplete,
        contactPoints: [completeContactPoint],
      };

      const result = validateAppConfig(appConfig, textMock);
      expect(result).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'contactPoints',
          }),
        ]),
      );
    });
  });
});

const completeContactPoint: ContactPoint = {
  category: 'Support',
  email: '',
  telephone: '',
  contactPage: '',
};
const appConfigComplete: AppConfigNew = {
  resourceType: APP_CONFIG_RESOURCE_TYPE,
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
  contactPoints: [completeContactPoint],
};
