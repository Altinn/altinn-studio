import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { isDataModelBindingsRequired } from 'src/layout';
import {
  validateDataModelBindingsList,
  validateDataModelBindingsSimple,
} from 'src/utils/layout/generator/validation/hooks';
import type { IDataModelBindings } from 'src/layout/layout';

export function useFileUploaderDataBindingsValidation<T extends 'FileUpload' | 'FileUploadWithTag'>(
  baseComponentId: string,
  bindings: IDataModelBindings<T>,
): string[] {
  const layoutLookups = useLayoutLookups();
  const lookupBinding = DataModels.useLookupBinding();
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
