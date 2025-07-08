import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';
import type { AppConfigNew, ContactPoint } from 'app-shared/types/AppConfig';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { ValidLanguage } from 'app-shared/types/SupportedLanguages';
import { statusMap } from './appConfigStatusUtils';

const supportedLanguages: ValidLanguage[] = ['nb', 'nn', 'en'];

export const validateAppConfig = (
  appConfig: AppConfigNew | undefined,
  t: (key: string, params?: KeyValuePairs<string>) => string,
): AppConfigFormError[] => {
  const errors: AppConfigFormError[] = [];

  if (!appConfig) {
    return [];
  }

  supportedLanguages.forEach((lang: ValidLanguage) => {
    // validate service name
    if (!appConfig.serviceName?.[lang]) {
      errors.push({
        field: 'serviceName',
        index: lang,
        error: t(`app_settings.about_tab_error_translation_missing_${lang}`, {
          field: t('app_settings.about_tab_error_usage_string_service_name'),
        }),
      });
    }

    // validate description
    if (!appConfig.description?.[lang]) {
      errors.push({
        field: 'description',
        index: lang,
        error: t(`app_settings.about_tab_error_translation_missing_${lang}`, {
          field: t('app_settings.about_tab_error_usage_string_description'),
        }),
      });
    }

    // validate right description
    if (appConfig.isDelegable && !appConfig.rightDescription?.[lang]) {
      errors.push({
        field: 'rightDescription',
        index: lang,
        error: t(`app_settings.about_tab_error_translation_missing_${lang}`, {
          field: t('app_settings.about_tab_error_usage_string_right_description'),
        }),
      });
    }
  });

  // validate status
  if (!Object.keys(statusMap).includes(appConfig.status)) {
    errors.push({
      field: 'status',
      error: t('app_settings.about_tab_status_field_error'),
    });
  }

  // validate availableForType
  if (!appConfig.availableForType?.length) {
    errors.push({
      field: 'availableForType',
      error: t('app_settings.about_tab_error_available_for_type'),
    });
  }

  // validate contactpoint
  if (!appConfig.contactPoints?.length) {
    errors.push({
      field: `contactPoints`,
      index: 0,
      error: t('app_settings.about_tab_error_contact_points'),
    });
  }
  appConfig.contactPoints?.map((contactPoint: ContactPoint, index: number) => {
    if (isContactPointEmpty(contactPoint)) {
      errors.push({
        field: 'contactPoints',
        index: index,
        error: t('app_settings.about_tab_error_contact_points'),
      });
    }
  });

  return errors;
};

function isContactPointEmpty(contactPoint: ContactPoint): boolean {
  return (
    contactPoint.category === '' &&
    contactPoint.email === '' &&
    contactPoint.telephone === '' &&
    contactPoint.contactPage === ''
  );
}
