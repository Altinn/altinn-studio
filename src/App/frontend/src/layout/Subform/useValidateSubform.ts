import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { getUiFolderSettings } from 'src/features/form/ui';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import type { ComponentValidation, SubformValidation } from 'src/features/validation';
import type { ComponentValidationContext } from 'src/layout';
import type { IData } from 'src/types/shared';

export function validateSubform(input: {
  targetType: string | undefined;
  elements: IData[];
  subformIdsWithError: string[];
  minCount: number | undefined;
  maxCount: number | undefined;
}): ComponentValidation[] {
  const { targetType, elements, subformIdsWithError } = input;
  if (!targetType || input.minCount === undefined || input.maxCount === undefined) {
    return [];
  }
  const validations: ComponentValidation[] = [];

  const { minCount, maxCount } = input;

  if (minCount > 0 && elements.length < minCount) {
    validations.push({
      message: { key: 'form_filler.error_min_count_not_reached_subform', params: [minCount, targetType] },
      severity: 'error',
      source: FrontendValidationSource.Component,
      category: ValidationMask.Required,
    });
  }

  if (maxCount > 0 && elements.length > maxCount) {
    validations.push({
      message: { key: 'form_filler.error_max_count_reached_subform_local', params: [targetType, maxCount] },
      severity: 'error',
      source: FrontendValidationSource.Component,
      category: ValidationMask.Required,
    });
  }

  if (subformIdsWithError.length) {
    const validation: SubformValidation = {
      subformDataElementIds: subformIdsWithError,
      message: { key: 'form_filler.error_validation_inside_subform', params: [targetType] },
      severity: 'error',
      source: FrontendValidationSource.Component,
      category: ValidationMask.Required,
      noIncrementalUpdates: true, // Validations for subform data is not updated incrementally in the main form
    };

    validations.push(validation);
  }

  return validations;
}

export function validateSubformForNode(ctx: ComponentValidationContext<'Subform'>): ComponentValidation[] {
  const targetType = getUiFolderSettings(ctx.component.layoutSet)?.defaultDataType;
  const dataTypeDefinition = targetType
    ? getApplicationMetadata().dataTypes.find((x) => x.id === targetType)
    : undefined;
  const elements = targetType ? ctx.instanceData.filter((dataElement) => dataElement.dataType === targetType) : [];
  const subformIdsWithError = elements
    .map((element) => element.id)
    .filter((dataElementId) => {
      const validations = ctx.formState.validation.otherDataElementBackendValidations[dataElementId];
      return (
        validations &&
        Object.values(validations).some((validationList) => validationList.some((v) => v.severity === 'error'))
      );
    });

  return validateSubform({
    targetType,
    elements,
    subformIdsWithError,
    minCount: dataTypeDefinition?.minCount,
    maxCount: dataTypeDefinition?.maxCount,
  });
}
