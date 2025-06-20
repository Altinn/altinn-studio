import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';
import type { AppConfigNew } from 'app-shared/types/AppConfig';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { SupportedLanguage, ValidLanguage } from 'app-shared/types/SupportedLanguages';
import type { TranslationFunction } from 'app-development/features/appSettings/types/Translation';
import { mapLanguageKeyToLanguageText } from './appConfigLanguageUtils';

const supportedLanguages: ValidLanguage[] = ['nb', 'nn', 'en'];
const supportedLanguagesWithoutNb: ValidLanguage[] = supportedLanguages.filter(
  (lang: ValidLanguage) => lang !== 'nb',
);

function getMissingLanguages(language: SupportedLanguage): ValidLanguage[] {
  return supportedLanguagesWithoutNb.filter((lang: ValidLanguage) => !language[lang]);
}

function getSingleMissingLanguageMessage(
  usageString: string,
  missingLang: ValidLanguage,
  t: TranslationFunction,
): string {
  const lang: string = mapLanguageKeyToLanguageText(missingLang, t).toLowerCase();
  return t('app_settings.about_tab_language_error_missing_1', {
    usageString,
    lang,
  });
}

function getMultipleMissingLanguagesMessage(
  usageString: string,
  missingLangs: ValidLanguage[],
  t: TranslationFunction,
): string {
  const lang2Key: ValidLanguage = missingLangs.pop();
  const lang2: string = mapLanguageKeyToLanguageText(lang2Key! as ValidLanguage, t).toLowerCase();
  const lang1: string = missingLangs
    .map((lang) => mapLanguageKeyToLanguageText(lang, t))
    .join(', ')
    .toLowerCase();

  return t('app_settings.about_tab_language_error_missing_2', {
    usageString,
    lang1,
    lang2,
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
  });

  return errors;
};
