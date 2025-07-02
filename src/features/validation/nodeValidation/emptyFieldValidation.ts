import { FD } from 'src/features/formData/FormDataWrite';
import { type ComponentValidation, FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { getFieldNameKey } from 'src/utils/formComponentUtils';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useItemFor } from 'src/utils/layout/useNodeItem';
import type { ValidLanguageKey } from 'src/features/language/useLanguage';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompTypes } from 'src/layout/layout';

/**
 * Default implementation of useEmptyFieldValidation
 * Checks all the component's dataModelBindings and returns one error for each one missing data
 */
export function useEmptyFieldValidationAllBindings<Type extends CompTypes>(
  baseComponentId: string,
  defaultText: ValidLanguageKey = 'form_filler.error_required',
): ComponentValidation[] {
  const dataModelBindings = useDataModelBindingsFor<Type>(baseComponentId);
  const item = useItemFor(baseComponentId);
  const required = 'required' in item ? item.required : false;
  const trb = item.textResourceBindings;
  const formDataSelector = FD.useDebouncedSelector();
  const invalidDataSelector = FD.useInvalidDebouncedSelector();
  if (!required || !dataModelBindings) {
    return [];
  }

  const validations: ComponentValidation[] = [];

  for (const [bindingKey, reference] of Object.entries(dataModelBindings as Record<string, IDataModelReference>)) {
    const data = formDataSelector(reference) ?? invalidDataSelector(reference);
    const asString =
      typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean' ? String(data) : '';

    if (asString.length === 0) {
      const key = trb && 'requiredValidation' in trb && trb.requiredValidation ? trb.requiredValidation : defaultText;
      const fieldReference = { key: getFieldNameKey(trb, bindingKey), makeLowerCase: true };

      validations.push({
        source: FrontendValidationSource.EmptyField,
        bindingKey,
        message: { key, params: [fieldReference] },
        severity: 'error',
        category: ValidationMask.Required,
      });
    }
  }
  return validations;
}

/**
 * Special implementation of useEmptyFieldValidation
 * Only checks simpleBinding, this is useful for components that may save additional data which is not directly controlled by the user,
 * like options-based components that can store the label and metadata about the options alongside the actual value
 */
export function useEmptyFieldValidationOnlyOneBinding<Binding extends string>(
  baseComponentId: string,
  binding: Binding,
  defaultText: ValidLanguageKey = 'form_filler.error_required',
): ComponentValidation[] {
  const item = useItemFor(baseComponentId);
  const required = 'required' in item ? item.required : false;
  const reference = item.dataModelBindings?.[binding as string] as IDataModelReference | undefined;
  const trb = item.textResourceBindings;
  const validData = FD.useDebouncedPick(reference);
  const invalidData = FD.useInvalidDebouncedPick(reference);
  const data = validData ?? invalidData;
  if (!required || !reference) {
    return [];
  }

  const validations: ComponentValidation[] = [];

  const asString =
    typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean' ? String(data) : '';

  if (asString.length === 0) {
    const key = trb && 'requiredValidation' in trb && trb.requiredValidation ? trb.requiredValidation : defaultText;
    const fieldReference = { key: getFieldNameKey(trb, binding), makeLowerCase: true };

    validations.push({
      source: FrontendValidationSource.EmptyField,
      bindingKey: binding,
      message: { key, params: [fieldReference] },
      severity: 'error',
      category: ValidationMask.Required,
    });
  }
  return validations;
}
