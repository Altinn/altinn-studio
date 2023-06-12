import { getTextFromAppOrDefault } from 'src/utils/textResource';
import { validationTexts } from 'src/utils/validation/validationTexts';
import type { ITextResource, IValidationIssue } from 'src/types';
import type { ILanguage } from 'src/types/shared';

export function getValidationMessage(
  issue: IValidationIssue,
  textResources: ITextResource[],
  language: ILanguage,
  params?: string[],
): string {
  if (issue.customTextKey) {
    return getTextFromAppOrDefault(issue.customTextKey, textResources, language, params, true);
  }

  if (issue.source && issue.code) {
    const resource = validationTexts[issue.source]?.[issue.code];
    if (resource) {
      return getTextFromAppOrDefault(resource, textResources, language, params, true);
    }
  }

  // Fallback to old behvaior if source not set.
  const legacyText = getTextFromAppOrDefault(issue.code, textResources, language, params, true);
  if (legacyText !== issue.code) {
    return legacyText;
  }

  return issue.source ? `${issue.source}.${issue.code}` : issue.code;
}
