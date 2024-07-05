import { useCurrentDataModelGuid } from 'src/features/datamodel/useBindingSchema';
import { useLaxInstance } from 'src/features/instance/InstanceContext';
import { useProcessTaskId } from 'src/features/instance/useProcessTaskId';
import { BackendValidationSeverity, BuiltInValidationIssueSources, ValidationMask } from 'src/features/validation';
import { validationTexts } from 'src/features/validation/backendValidation/validationTexts';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { TaskKeys } from 'src/hooks/useNavigatePage';
import type { TextReference } from 'src/features/language/useLanguage';
import type {
  BackendValidationIssue,
  BaseValidation,
  FieldValidation,
  ValidationSeverity,
} from 'src/features/validation';

/**
 * We need to map the severity we get from backend into the format used when storing in redux.
 */
const severityMap: { [s in BackendValidationSeverity]: ValidationSeverity } = {
  [BackendValidationSeverity.Error]: 'error',
  [BackendValidationSeverity.Warning]: 'warning',
  [BackendValidationSeverity.Informational]: 'info',
  [BackendValidationSeverity.Success]: 'success',
};

export function useShouldValidateInitial(): boolean {
  const isCustomReceipt = useProcessTaskId() === TaskKeys.CustomReceipt;
  const isPDF = useIsPdf();
  const shouldLoadValidations = !isCustomReceipt && !isPDF;

  const instance = useLaxInstance();
  const currentDataElementId = useCurrentDataModelGuid();
  const isDataElementLocked = instance?.data?.data.find((el) => el.id === currentDataElementId)?.locked;

  return shouldLoadValidations && !isDataElementLocked;
}

export function getValidationIssueSeverity(issue: BackendValidationIssue): ValidationSeverity {
  return severityMap[issue.severity];
}

export function mapValidationIssueToFieldValidation(issue: BackendValidationIssue): BaseValidation | FieldValidation {
  const { field, source } = issue;
  const severity = getValidationIssueSeverity(issue);
  const message = getValidationIssueMessage(issue);

  /**
   * Identify category (visibility mask)
   * Standard validation sources should use the Backend mask
   * Custom backend validations should use the CustomBackend mask
   */
  let category: number = ValidationMask.Backend;
  if (!Object.values<string>(BuiltInValidationIssueSources).includes(source)) {
    if (issue.showImmediately) {
      category = 0;
    } else if (issue.actLikeRequired) {
      category = ValidationMask.Required;
    } else {
      category = ValidationMask.CustomBackend;
    }
  }

  if (!field) {
    // Unmapped error (task validation)
    return { severity, message, category: 0, source };
  }

  return { field, severity, message, category, source };
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
