import {
  useValidateDataModelBindingsList,
  useValidateDataModelBindingsSimple,
} from 'src/utils/layout/generator/validation/hooks';
import type { IDataModelBindings } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function useFileUploaderDataBindingsValidation<T extends 'FileUpload' | 'FileUploadWithTag'>(
  node: LayoutNode<T>,
  bindings: IDataModelBindings<T>,
): string[] {
  const isRequired = node.def.isDataModelBindingsRequired(node as never);
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
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useValidateDataModelBindingsSimple(node, bindings);
  }

  if (listBinding) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useValidateDataModelBindingsList(node, bindings);
  }

  return [];
}
