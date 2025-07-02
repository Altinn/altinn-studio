import { FD } from 'src/features/formData/FormDataWrite';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

function useHasDataInBindings(node: LayoutNode) {
  const dataModelBindings = useDataModelBindingsFor(node.baseId);
  const formData = FD.useFreshBindings(dataModelBindings, 'raw');

  // Checks if there is data in any of the data model binding
  return Object.values(formData).some((value) => value !== undefined && value !== null && value !== '');
}

export function useHasNoDataInBindings(node: LayoutNode) {
  return !useHasDataInBindings(node);
}

export function useHasBindingsAndNoData(node: LayoutNode) {
  const hasBindings = !!useDataModelBindingsFor(node.baseId);
  return useHasNoDataInBindings(node) && hasBindings;
}
