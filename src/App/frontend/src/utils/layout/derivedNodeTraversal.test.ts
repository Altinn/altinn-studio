import { describe, expect, it } from 'vitest';

import { getDerivedNodeDescendantIds } from 'src/utils/layout/derivedNodeTraversal';
import type { RowContext } from 'src/utils/layout/rowContext';

describe('getDerivedNodeDescendantIds', () => {
  const rowContext = (rowIndex: number): RowContext => ({
    groupBinding: { dataType: 'model', field: 'Rows' },
    rowIndex,
    rowId: `row-${rowIndex}`,
  });
  const nodes = [
    { id: 'group', parentId: undefined, rowContexts: [] },
    { id: 'field-0', parentId: 'group', rowContexts: [rowContext(0)] },
    { id: 'nested-0', parentId: 'group', rowContexts: [rowContext(0)] },
    { id: 'nested-field-0', parentId: 'nested-0', rowContexts: [rowContext(0), rowContext(2)] },
    { id: 'field-1', parentId: 'group', rowContexts: [rowContext(1)] },
  ];

  it('preserves traversal order and row restrictions across repeated scopes', () => {
    expect(getDerivedNodeDescendantIds(nodes, 'group')).toEqual(['field-0', 'nested-0', 'nested-field-0', 'field-1']);
    expect(getDerivedNodeDescendantIds(nodes, 'group', 0)).toEqual(['field-0', 'nested-0', 'nested-field-0']);
    expect(getDerivedNodeDescendantIds(nodes, 'group', 1)).toEqual(['field-1']);
    expect(getDerivedNodeDescendantIds(nodes, 'nested-0', 2)).toEqual(['nested-field-0']);
    expect(getDerivedNodeDescendantIds(nodes, 'nested-0', 0)).toEqual([]);
    expect(getDerivedNodeDescendantIds(nodes, 'missing')).toEqual([]);
  });

  it('reads new topology after rows are removed or moved in a new snapshot', () => {
    getDerivedNodeDescendantIds(nodes, 'group');
    const next = nodes
      .filter((node) => node.id !== 'field-1')
      .map((node) => (node.id === 'nested-field-0' ? { ...node, parentId: 'group' } : node));
    expect(getDerivedNodeDescendantIds(next, 'nested-0')).toEqual([]);
    expect(getDerivedNodeDescendantIds(next, 'group')).toEqual(['field-0', 'nested-0', 'nested-field-0']);
    expect(getDerivedNodeDescendantIds(nodes, 'nested-0')).toEqual(['nested-field-0']);
  });
});
