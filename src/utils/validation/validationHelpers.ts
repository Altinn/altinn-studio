import { validationTexts } from 'src/utils/validation/validationTexts';
import type { IUseLanguage } from 'src/hooks/useLanguage';
import type { IValidationIssue } from 'src/types';

export function getValidationMessage(issue: IValidationIssue, langTools: IUseLanguage, params?: string[]): string {
  const { langAsString } = langTools;
  if (issue.customTextKey) {
    return langAsString(issue.customTextKey, params);
  }

  if (issue.source && issue.code) {
    const resource = validationTexts[issue.source]?.[issue.code];
    if (resource) {
      return langAsString(resource, params);
    }
  }

  // Fallback to old behavior if source not set.
  const legacyText = langAsString(issue.code, params);
  if (legacyText !== issue.code) {
    return legacyText;
  }

  return issue.source ? `${issue.source}.${issue.code}` : issue.code;
}
