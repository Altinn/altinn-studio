import type { ExprVal, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { ILayoutFile } from 'src/layout/common.generated';
import type { CompExternal } from 'src/layout/layout';

export interface DataObject {
  [key: string]: string | null | object | DataObject | undefined;
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type ResolvedCompExternal = DistributiveOmit<CompExternal, 'children'> & {
  children: ResolvedCompExternal[] | undefined;
};

export interface ResolvedLayoutFile {
  $schema?: string;
  data: { layout: ResolvedCompExternal[]; hidden?: ExprValToActualOrExpr<ExprVal.Boolean>; expandedWidth?: boolean };
}

export type ResolvedLayoutCollection = {
  [p: string]: ResolvedLayoutFile;
};

/**
 * Recursively transforms the layout so that if an item has a "children" array of IDs,
 * it replaces those IDs with the actual child objects (and removes them from the top-level).
 */
export function moveChildren(input: ILayoutFile): ResolvedLayoutFile {
  const allItems = input.data?.layout ?? [];
  const itemMap = new Map<string, CompExternal>(allItems.map((item) => [item.id, item]));

  function resolveItem(id: string, visited = new Set<string>()): ResolvedCompExternal {
    const item = itemMap.get(id);

    if (!item) {
      throw new Error(`No item found with id: ${id}`);
    }
    if (visited.has(id)) {
      throw new Error(`Circular reference detected for id: ${id}`);
    }
    visited.add(id);

    if ('children' in item && Array.isArray(item.children)) {
      const { children, ...rest } = item;
      return {
        ...rest,
        children: children.map((childId) => resolveItem(childId, visited)),
      } as ResolvedCompExternal;
    }

    return { ...item, children: undefined } as ResolvedCompExternal;
  }

  // Identify all child IDs
  const childIds = new Set<string>();
  for (const item of allItems) {
    if ('children' in item && Array.isArray(item.children)) {
      for (const c of item.children) {
        childIds.add(c);
      }
    }
  }

  // Root items are those not listed as someone else's child
  const rootItems = allItems.filter((item) => !childIds.has(item.id));
  const visited = new Set<string>();
  const resolvedLayout = rootItems.map((root) => resolveItem(root.id, visited));

  return {
    $schema: input.$schema,
    data: {
      layout: resolvedLayout,
      hidden: input.data.hidden,
      expandedWidth: input.data.expandedWidth,
    },
  };
}
