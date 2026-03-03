import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';

/**
 * Find a component by ID across all layouts in the client.
 */
export function findComponentById(
  client: { getLayoutNames(): string[]; getFormLayout(name: string): { data: { layout: ResolvedCompExternal[] } } },
  targetId: string,
): ResolvedCompExternal | undefined {
  for (const layoutName of client.getLayoutNames()) {
    const layout = client.getFormLayout(layoutName);
    const found = findInComponents(layout.data.layout, targetId);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function findInComponents(components: ResolvedCompExternal[], targetId: string): ResolvedCompExternal | undefined {
  for (const comp of components) {
    if (comp.id === targetId) {
      return comp;
    }
    if (comp.children) {
      const found = findInComponents(comp.children, targetId);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

/**
 * Extract the simpleBinding path from a component's dataModelBindings.
 */
export function getSimpleBinding(component: ResolvedCompExternal): string | undefined {
  const bindings = (component as { dataModelBindings?: { simpleBinding?: string } }).dataModelBindings;
  if (!bindings?.simpleBinding) {
    return undefined;
  }
  return extractField(bindings.simpleBinding);
}

/**
 * Get the title text resource key from a component's textResourceBindings.
 */
export function getTitleKey(component: ResolvedCompExternal): string | undefined {
  const trb = (component as { textResourceBindings?: { summaryTitle?: string; title?: string } }).textResourceBindings;
  return trb?.summaryTitle ?? trb?.title;
}
