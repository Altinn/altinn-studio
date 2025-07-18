import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';
import type { AppConfigNew } from 'app-shared/types/AppConfig';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { ValidLanguage } from 'app-shared/types/SupportedLanguages';

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

  return errors;
};
