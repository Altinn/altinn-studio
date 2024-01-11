import { BackendValidationSeverity } from 'src/features/validation';
import { validationTexts } from 'src/features/validation/backend/validationTexts';
import type { TextReference } from 'src/features/language/useLanguage';
import type { BackendValidationIssue, ValidationSeverity } from 'src/features/validation';

/**
 * We need to map the severity we get from backend into the format used when storing in redux.
 */
const severityMap: { [s in BackendValidationSeverity]: ValidationSeverity } = {
  [BackendValidationSeverity.Error]: 'error',
  [BackendValidationSeverity.Warning]: 'warning',
  [BackendValidationSeverity.Informational]: 'info',
  [BackendValidationSeverity.Success]: 'success',
};

export function getValidationIssueSeverity(issue: BackendValidationIssue): ValidationSeverity {
  return severityMap[issue.severity];
}

/**
 * Gets standard validation messages for backend validation issues.
 */
export function getValidationIssueMessage(issue: BackendValidationIssue): TextReference {
  if (issue.customTextKey) {
    return { key: issue.customTextKey, params: issue.customTextParams };
  }

  if (issue.source && issue.code) {
    const resource = validationTexts[issue.source]?.[issue.code];
    if (resource) {
      return { key: resource };
    }
  }

  // Fallback to old behavior if source not set.
  const legacyText = issue.code;
  if (legacyText !== issue.code) {
    return { key: legacyText };
  }

  if (issue.description) {
    return { key: issue.description };
  }

  return { key: issue.source ? `${issue.source}.${issue.code}` : issue.code };
}
