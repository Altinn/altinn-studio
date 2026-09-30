import type { RowContext } from 'src/utils/layout/rowContext';

type TraversableDerivedNode = {
  id: string;
  parentId: string | undefined;
  rowContexts: RowContext[];
};

const emptyArray: never[] = [];

export function getDerivedNodeDescendantIds<T extends TraversableDerivedNode>(
  nodes: T[],
  nodeId: string,
  restriction?: number,
): string[] {
  const childrenByParent = new Map<string, T[]>();
  let parentRowContextCount: number | undefined;

  for (const node of nodes) {
    if (node.id === nodeId) {
      parentRowContextCount = node.rowContexts.length;
    }
    if (!node.parentId) {
      continue;
    }

    const children = childrenByParent.get(node.parentId);
    if (children) {
      children.push(node);
    } else {
      childrenByParent.set(node.parentId, [node]);
    }
  }

  if (parentRowContextCount === undefined) {
    return emptyArray;
  }

  const rowContextIndex = parentRowContextCount;
  const descendants: string[] = [];
  function visit(parentId: string) {
    for (const child of childrenByParent.get(parentId) ?? emptyArray) {
      if (restriction !== undefined && child.rowContexts[rowContextIndex]?.rowIndex !== restriction) {
        continue;
      }

      descendants.push(child.id);
      visit(child.id);
    }
  }

  visit(nodeId);
  return descendants;
}
