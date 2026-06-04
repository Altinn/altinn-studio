import { isDataModelBindingsRequired } from 'src/layout';
import { validateDataModelBindingsList, validateDataModelBindingsSimple } from 'src/utils/layout/validation/hooks';
import type { DataModelBindingValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';

export function validateFileUploaderDataBindings<T extends 'FileUpload' | 'FileUploadWithTag' | 'ImageUpload'>(
  baseComponentId: string,
  bindings: IDataModelBindings<T>,
  { lookupBinding, layoutLookups }: DataModelBindingValidationContext,
): string[] {
  const isRequired = isDataModelBindingsRequired(baseComponentId, layoutLookups);
  const hasBinding = bindings && ('simpleBinding' in bindings || 'list' in bindings);

  if (!isRequired && !hasBinding) {
    return [];
  }
  if (isRequired && !hasBinding) {
    return [
      `En simpleBinding, eller list-datamodellbinding, er påkrevd for denne komponenten når den brukes ` +
        `i en repeterende gruppe, men dette mangler i layout-konfigurasjonen.`,
    ];
  }

  const simpleBinding = bindings && 'simpleBinding' in bindings ? bindings.simpleBinding : undefined;
  const listBinding = bindings && 'list' in bindings ? bindings.list : undefined;

  if (simpleBinding) {
    return validateDataModelBindingsSimple(baseComponentId, bindings, lookupBinding, layoutLookups);
  }

  if (listBinding) {
    return validateDataModelBindingsList(baseComponentId, bindings, lookupBinding, layoutLookups);
  }

  return [];
}
