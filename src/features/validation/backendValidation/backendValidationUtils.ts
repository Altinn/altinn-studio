import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useProcessTaskId } from 'src/features/instance/useProcessTaskId';
import { BackendValidationSeverity, BuiltInValidationIssueSources, ValidationMask } from 'src/features/validation';
import { validationTexts } from 'src/features/validation/backendValidation/validationTexts';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { TaskKeys } from 'src/hooks/useNavigatePage';
import type { TextReference } from 'src/features/language/useLanguage';
import type {
  BackendFieldValidatorGroups,
  BackendValidationIssue,
  BaseValidation,
  DataModelValidations,
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
  const isStateless = useApplicationMetadata().isStatelessApp;
  const writableDataTypes = DataModels.useWritableDataTypes();
  return !isCustomReceipt && !isPDF && !isStateless && !!writableDataTypes?.length;
}

export function getValidationIssueSeverity(issue: BackendValidationIssue): ValidationSeverity {
  return severityMap[issue.severity];
}

/**
 * Checks the source field of a validation issue to determine if it is a standard backend validation
 * which is already covered by frontend validation and should therefore not be shown as it would be a duplicate
 */
function isStandardBackend(rawSource: string): boolean {
  const source = rawSource.includes('+') ? rawSource.split('+')[0] : rawSource;
  return Object.values<string>(BuiltInValidationIssueSources).includes(source);
}

/**
 * Extracts field validations from a list of validation issues and assigns the correct data type based on the dataElementId
 * Will skip over any validations that are missing a field and/or dataElementId
 */
export function mapBackendIssuesToFieldValdiations(
  issues: BackendValidationIssue[],
  getDataTypeForElementId: ReturnType<typeof DataModels.useGetDataTypeForDataElementId>,
): FieldValidation[] {
  const fieldValidations: FieldValidation[] = [];
  for (const issue of issues) {
    const { field, source, dataElementId } = issue;

    if (!field) {
      continue;
    }

    const dataType = getDataTypeForElementId(dataElementId);

    if (!dataType) {
      continue;
    }

    const severity = getValidationIssueSeverity(issue);
    const message = getValidationIssueMessage(issue);

    /**
     * Identify category (visibility mask)
     * Standard validation sources should use the Backend mask
     * Custom backend validations should use the CustomBackend mask
     */
    let category: number = ValidationMask.Backend;
    if (!isStandardBackend(issue.source)) {
      if (issue.showImmediately) {
        category = 0;
      } else if (issue.actLikeRequired) {
        category = ValidationMask.Required;
      } else {
        category = ValidationMask.CustomBackend;
      }
    }

    fieldValidations.push({ field, dataType, severity, message, category, source });
  }

  return fieldValidations;
}

export function mapBackendIssuesToTaskValidations(issues: BackendValidationIssue[]): BaseValidation[] {
  const taskValidations: BaseValidation[] = [];
  for (const issue of issues) {
    const { field, source } = issue;
    if (field) {
      continue;
    }

    const severity = getValidationIssueSeverity(issue);
    const message = getValidationIssueMessage(issue);

    taskValidations.push({ severity, message, category: 0, source });
  }
  return taskValidations;
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

export function mapValidatorGroupsToDataModelValidations(
  validators: BackendFieldValidatorGroups,
  dataTypes: string[],
): DataModelValidations {
  const backendValidations: DataModelValidations = {};

  // We need to clear all data types regardless if there are any validations or not
  // Otherwise it would not update if there are no validations for a data type any more
  for (const dataType of dataTypes) {
    backendValidations[dataType] = {};
  }

  // Map validator groups to validations per data type and field
  for (const group of Object.values(validators)) {
    for (const validation of group) {
      if (!backendValidations[validation.dataType]) {
        backendValidations[validation.dataType] = {};
      }

      if (!backendValidations[validation.dataType][validation.field]) {
        backendValidations[validation.dataType][validation.field] = [];
      }

      backendValidations[validation.dataType][validation.field].push(validation);
    }
  }

  return backendValidations;
}
