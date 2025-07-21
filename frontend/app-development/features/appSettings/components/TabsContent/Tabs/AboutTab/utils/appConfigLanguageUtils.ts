import type { ValidLanguage } from 'app-shared/types/SupportedLanguages';
import type { TranslationFunction } from 'app-development/features/appSettings/types/Translation';
import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';

export function mapLanguageKeyToLanguageText(
  val: ValidLanguage,
  translationFunction: TranslationFunction,
): string {
  if (val === 'nb') return translationFunction('language.nb');
  if (val === 'nn') return translationFunction('language.nn');
  return translationFunction('language.en');
}

export function getErrorMessagesForLanguage(
  errors: AppConfigFormError[],
  language: ValidLanguage,
): string[] | undefined {
  const filteredErrors: AppConfigFormError[] = filterOutErrorsForLanguage(errors, language);
  const errorMessages: string[] = mapErrorToString(filteredErrors);
  const errorMessagesHasValue: boolean = getErrorMessagesHasValue(errorMessages);

  if (errorMessagesHasValue) {
    return errorMessages;
  }
  return undefined;
}

function filterOutErrorsForLanguage(
  errors: AppConfigFormError[],
  language: ValidLanguage,
): AppConfigFormError[] {
  return errors.filter((error) => error.index === language);
}

function mapErrorToString(errors: AppConfigFormError[]): string[] {
  return errors.map((error) => error.error);
}

function getErrorMessagesHasValue(errors: string[]): boolean {
  return errors.length > 0;
}
