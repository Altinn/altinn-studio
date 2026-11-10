import type { RowContext } from 'src/utils/layout/rowContext';

type TraversableDerivedNode = {
  id: string;
  parentId: string | undefined;
  rowContexts: RowContext[];
};

const emptyArray: never[] = [];

type NodeTopology = {
  childrenByParent: Map<string, TraversableDerivedNode[]>;
  rowContextCounts: Map<string, number>;
};

// Runtime node arrays are immutable snapshots. Validation requests many row scopes
// from the same snapshot, so build its parent index once instead of once per row.
const topologyByNodes = new WeakMap<TraversableDerivedNode[], NodeTopology>();

function getTopology(nodes: TraversableDerivedNode[]): NodeTopology {
  const cached = topologyByNodes.get(nodes);
  if (cached) {
    return cached;
  }
  const childrenByParent = new Map<string, TraversableDerivedNode[]>();
  const rowContextCounts = new Map<string, number>();
  for (const node of nodes) {
    rowContextCounts.set(node.id, node.rowContexts.length);
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
  const topology = { childrenByParent, rowContextCounts };
  topologyByNodes.set(nodes, topology);
  return topology;
}

export function getDerivedNodeDescendantIds<T extends TraversableDerivedNode>(
  nodes: T[],
  nodeId: string,
  restriction?: number,
): string[] {
  const { childrenByParent, rowContextCounts } = getTopology(nodes);
  const parentRowContextCount = rowContextCounts.get(nodeId);

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
