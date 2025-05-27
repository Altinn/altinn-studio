import type { AppResource, AppResourceFormError } from 'app-shared/types/AppResource';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { SupportedLanguage, ValidLanguage } from 'app-shared/types/SupportedLanguages';
import type { TranslationFunction } from 'app-development/features/appSettings/types/Translation';
import { mapLanguageKeyToLanguageText } from './appResourceLanguageUtils';

const supportedLanguages: ValidLanguage[] = ['nb', 'nn', 'en'];

function getMissingLanguages(language: SupportedLanguage): ValidLanguage[] {
  return supportedLanguages.filter((lang) => !language[lang]);
}

function getSingleMissingLanguageMessage(
  usageString: string,
  missingLang: ValidLanguage,
  t: TranslationFunction,
): string {
  return t('app_settings.about_tab_language_error_missing_1', {
    usageString,
    lang: mapLanguageKeyToLanguageText(missingLang, t),
  });
}

function getMultipleMissingLanguagesMessage(
  usageString: string,
  missingLangs: ValidLanguage[],
  t: TranslationFunction,
): string {
  const lang2 = missingLangs.pop();
  const lang1 = missingLangs.map((lang) => mapLanguageKeyToLanguageText(lang, t)).join(', ');
  return t('app_settings.about_tab_language_error_missing_2', {
    usageString,
    lang1,
    lang2: mapLanguageKeyToLanguageText(lang2!, t),
  });
}

export function getMissingInputLanguageString(
  language: SupportedLanguage,
  usageString: string,
  t: TranslationFunction,
): string {
  const missingLanguages = getMissingLanguages(language);

  if (missingLanguages.length === 1) {
    return getSingleMissingLanguageMessage(usageString, missingLanguages[0], t);
  } else if (missingLanguages.length > 1) {
    return getMultipleMissingLanguagesMessage(usageString, [...missingLanguages], t);
  }

  return '';
}

export const validateAppResource = (
  appResource: AppResource | undefined,
  t: (key: string, params?: KeyValuePairs<string>) => string,
): AppResourceFormError[] => {
  const errors: AppResourceFormError[] = [];

  if (!appResource) {
    return [];
  }

  // validate service name
  const serviceNameError = getMissingInputLanguageString(
    {
      nb: appResource.serviceName?.nb,
      nn: appResource.serviceName?.nn,
      en: appResource.serviceName?.en,
    },
    t('app_settings.about_tab_error_usage_string_service_name'),
    t,
  );
  if (serviceNameError) {
    errors.push({
      field: 'serviceName',
      index: 'nb',
      error: serviceNameError,
    });
  }
  if (!appResource.serviceName?.nn) {
    errors.push({
      field: 'serviceName',
      index: 'nn',
      error: t('app_settings.about_tab_error_translation_missing_service_name_nn'),
    });
  }
  if (!appResource.serviceName?.en) {
    errors.push({
      field: 'serviceName',
      index: 'en',
      error: t('app_settings.about_tab_error_translation_missing_service_name_en'),
    });
  }

  return errors;
};
