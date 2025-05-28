import { FD } from 'src/features/formData/FormDataWrite';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

function useHasDataInBindings(node: LayoutNode) {
  const dataModelBindings = useNodeItem(node, (i) => i.dataModelBindings);
  const formData = FD.useFreshBindings(dataModelBindings, 'raw');

  // Checks if there is data in any of the data model binding
  return Object.values(formData).some((value) => value !== undefined && value !== null && value !== '');
}

export function useHasNoDataInBindings(node: LayoutNode) {
  return !useHasDataInBindings(node);
}

export function useHasBindingsAndNoData(node: LayoutNode) {
  const hasBindings = useNodeItem(node, (i) => !!i.dataModelBindings);
  return useHasNoDataInBindings(node) && hasBindings;
}
