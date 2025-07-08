import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { useShallowMemo } from 'src/hooks/useShallowMemo';
import { getComponentDef, implementsDisplayData } from 'src/layout';
import { useExternalItem } from 'src/utils/layout/hooks';

export function useDisplayData(baseComponentId: string): string {
  const component = useExternalItem(baseComponentId);
  if (!component) {
    return '';
  }
  const def = getComponentDef(component.type);
  if (!implementsDisplayData(def)) {
    return '';
  }

  return def.useDisplayData(baseComponentId);
}

/**
 * Use displayData for multiple node ids at once. Make sure you always call this with the same nodeIds, otherwise
 * you'll break the rules of hooks.
 */
export function useDisplayDataFor(componentIds: string[]): { [componentId: string]: string | undefined } {
  const layoutLookups = useLayoutLookups();
  const output: { [componentId: string]: string | undefined } = {};

  for (const id of componentIds) {
    const type = layoutLookups.allComponents[id]?.type;
    if (!type) {
      continue;
    }
    const def = getComponentDef(type);
    if (!implementsDisplayData(def)) {
      continue;
    }
    output[id] = def.useDisplayData(id);
  }

  return useShallowMemo(output);
}
