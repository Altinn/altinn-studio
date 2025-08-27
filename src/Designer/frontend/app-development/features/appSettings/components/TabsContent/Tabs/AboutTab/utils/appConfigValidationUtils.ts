import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';
import type { AppConfigNew, ContactPoint } from 'app-shared/types/AppConfig';
import type { ValidLanguage } from 'app-shared/types/SupportedLanguages';
import { statusMap } from './appConfigStatusUtils';
import type { TranslationFunction } from '../../../../../types/Translation';

const supportedLanguages: ValidLanguage[] = ['nb', 'nn', 'en'];

export const validateAppConfig = (
  appConfig: AppConfigNew | undefined,
  t: TranslationFunction,
): AppConfigFormError[] => {
  if (!appConfig) return [];

  return [
    ...validateTranslations(appConfig, t),
    ...validateStatus(appConfig, t),
    ...validateAvailableForType(appConfig, t),
    ...validateContactPoints(appConfig, t),
  ];
};

function validateTranslations(
  appConfig: AppConfigNew,
  t: TranslationFunction,
): AppConfigFormError[] {
  const errors: AppConfigFormError[] = [];

  supportedLanguages.forEach((lang) => {
    if (!appConfig.serviceName?.[lang]) {
      errors.push(
        missingTranslationError(
          'serviceName',
          lang,
          t,
          'app_settings.about_tab_error_usage_string_service_name',
        ),
      );
    }

    if (!appConfig.description?.[lang]) {
      errors.push(
        missingTranslationError(
          'description',
          lang,
          t,
          'app_settings.about_tab_error_usage_string_description',
        ),
      );
    }

    if (appConfig.isDelegable && !appConfig.rightDescription?.[lang]) {
      errors.push(
        missingTranslationError(
          'rightDescription',
          lang,
          t,
          'app_settings.about_tab_error_usage_string_right_description',
        ),
      );
    }
  });

  return errors;
}

function missingTranslationError(
  field: keyof AppConfigNew,
  lang: ValidLanguage,
  t: TranslationFunction,
  fieldKey: string,
): AppConfigFormError {
  return {
    field,
    index: lang,
    error: t(`app_settings.about_tab_error_translation_missing_${lang}`, {
      field: t(fieldKey),
    }),
  };
}

function validateStatus(appConfig: AppConfigNew, t: (key: string) => string): AppConfigFormError[] {
  if (!Object.keys(statusMap).includes(appConfig.status)) {
    return [
      {
        field: 'status',
        error: t('app_settings.about_tab_status_field_error'),
      },
    ];
  }
  return [];
}

function validateAvailableForType(
  appConfig: AppConfigNew,
  t: TranslationFunction,
): AppConfigFormError[] {
  if (!appConfig.availableForType?.length) {
    return [
      {
        field: 'availableForType',
        error: t('app_settings.about_tab_error_available_for_type'),
      },
    ];
  }
  return [];
}

function validateContactPoints(
  appConfig: AppConfigNew,
  t: TranslationFunction,
): AppConfigFormError[] {
  const errors: AppConfigFormError[] = [];

  if (!appConfig.contactPoints?.length) {
    errors.push({
      field: 'contactPoints',
      index: 0,
      error: t('app_settings.about_tab_error_contact_points', { index: indexValue(0) }),
    });
    return errors;
  }

  appConfig.contactPoints.forEach((contactPoint, index) => {
    if (isContactPointEmpty(contactPoint)) {
      errors.push({
        field: 'contactPoints',
        index,
        error: t('app_settings.about_tab_error_contact_points', { index: indexValue(index) }),
      });
    }
  });

  return errors;
}

const indexValue = (index: number): string => String(index + 1);

function isContactPointEmpty(contactPoint: ContactPoint): boolean {
  return (
    contactPoint.category === '' &&
    contactPoint.email === '' &&
    contactPoint.telephone === '' &&
    contactPoint.contactPage === ''
  );
}
