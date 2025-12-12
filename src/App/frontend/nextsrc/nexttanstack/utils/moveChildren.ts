// import type { ILayoutFile } from 'src/layout/common.generated';
// import type { ResolvedCompExternal, ResolvedLayoutFile } from 'src/next/stores/layoutStore';

import type { ExprVal, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { ILayoutFile } from 'src/layout/common.generated';
import type { CompExternal } from 'src/layout/layout';

export type ResolvedCompExternal = CompExternal & ChildrenComponents;

export interface ChildrenComponents {
  children: ResolvedCompExternal[] | undefined;
}

export interface ResolvedLayoutFile {
  $schema?: string;
  data: { layout: CompExternal[]; hidden?: ExprValToActualOrExpr<ExprVal.Boolean>; expandedWidth?: boolean };
}

/**
 * Recursively transforms the layout so that if an item has a "children" array of IDs,
 * it replaces those IDs with the actual child objects (and removes them from the top-level).
 */
export function moveChildren(input: ILayoutFile): ResolvedLayoutFile {
  const allItems = input.data?.layout ?? [];
  const itemMap = new Map<string, any>(allItems.map((item) => [item.id, item]));

  // function getIsHidden(hiddenVal: unknown): boolean {
  //   // Adjust to your own logic for evaluating 'hidden'
  //   if (typeof hiddenVal === 'boolean') {
  //     return hiddenVal;
  //   }
  //   return false;
  // }

  function resolveItem(id: string, visited = new Set<string>()): ResolvedCompExternal {
    const item = itemMap.get(id);
    if (!item) {
      throw new Error(`No item found with id: ${id}`);
    }
    if (visited.has(id)) {
      throw new Error(`Circular reference detected for id: ${id}`);
    }
    visited.add(id);

    const { children, ...rest } = item;
    const resolved: ResolvedCompExternal = {
      ...rest,
      //isHidden: getIsHidden(hidden),
      //renderedValue: '', // or any other computed string
    };

    if (Array.isArray(children)) {
      resolved.children = children.map((childId: string) => resolveItem(childId, visited));
    }

    return resolved;
  }

  // Identify all child IDs
  const childIds = new Set<string>();
  for (const item of allItems) {
    // @ts-ignore
    if (item.children && Array.isArray(item.children)) {
      // @ts-ignore
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
