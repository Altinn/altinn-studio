import type { ValidLanguage } from 'app-shared/types/SupportedLanguages';
import type { TranslationFunction } from 'app-development/features/appSettings/types/Translation';
import type { AppResourceFormError } from 'app-shared/types/AppResource';

const NUMBER_OF_ROWS_IN_TEXTAREA: number = 5;

export function mapLanguageKeyToLanguageText(
  val: ValidLanguage,
  translationFunction: TranslationFunction,
): string {
  if (val === 'nb') return translationFunction('language.nb');
  if (val === 'nn') return translationFunction('language.nn');
  return translationFunction('language.en');
}

export function getErrorMessagesForLanguage(
  errors: AppResourceFormError[],
  language: ValidLanguage,
): string[] | undefined {
  const filteredErrors: AppResourceFormError[] = filterOutErrorsForLanguage(errors, language);
  const errorMessages: string[] = mapErrorToString(filteredErrors);
  const errorMessagesHasValue: boolean = getErrorMessagesHasValue(errorMessages);

  if (errorMessagesHasValue) {
    return errorMessages;
  }
  return undefined;
}

function filterOutErrorsForLanguage(
  errors: AppResourceFormError[],
  language: ValidLanguage,
): AppResourceFormError[] {
  return errors.filter((error) => error.index === language);
}

function mapErrorToString(errors: AppResourceFormError[]): string[] {
  return errors.map((error) => error.error);
}

function getErrorMessagesHasValue(errors: string[]): boolean {
  return errors.length > 0;
}

export function getTextfieldRows(isTextArea: boolean): number | undefined {
  return isTextArea ? NUMBER_OF_ROWS_IN_TEXTAREA : undefined;
}
