import type { ReactNode } from 'react';
import React from 'react';
import {
  extractIdFromGroup,
  extractIdFromTreeItem,
  findAllNodeIds,
  findAllParentIds,
  findAllVisibleNodeIds,
  findDirectChildIds,
  findFirstChildId,
  findFirstNodeId,
  findLastVisibleNodeId,
  findNextVisibleNodeId,
  findNodeIndexWithinGroup,
  findParentId,
  findPreviousVisibleNodeId,
  hasChildNodes,
  makeDomGroupId,
  makeDomTreeItemId,
} from './domUtils';
import { render } from '@testing-library/react';

describe('domUtils', () => {
  describe('makeDomTreeItemId', () => {
    it('Returns a string with the correct format', () => {
      expect(makeDomTreeItemId('root1', 'bar')).toBe('root1-bar-treeitem');
      expect(makeDomTreeItemId('root2', 'foo')).toBe('root2-foo-treeitem');
    });
  });

  describe('extractIdFromTreeItem', () => {
    it('Returns the correct id from a string formatted by makeDomTreeItemId', () => {
      const nodeId = 'nodeId';
      const rootId = 'rootId';
      const treeItemId = makeDomTreeItemId(rootId, nodeId);
      expect(extractIdFromTreeItem(rootId, treeItemId)).toBe(nodeId);
    });

    it('Returns undefined if no id string is given', () => {
      expect(extractIdFromTreeItem('rootId', '')).toBeUndefined();
    });
  });

  describe('makeDomGroupId', () => {
    it('Returns a string with the correct format', () => {
      expect(makeDomGroupId('root1', 'bar')).toBe('root1-bar-group');
      expect(makeDomGroupId('root2', 'foo')).toBe('root2-foo-group');
    });
  });

  describe('extractIdFromGroup', () => {
    it('Returns the correct id from a string formatted by makeDomGroupId', () => {
      const nodeId = 'nodeId';
      const rootId = 'rootId';
      const groupId = makeDomGroupId(rootId, nodeId);
      expect(extractIdFromGroup(rootId, groupId)).toBe(nodeId);
    });

    it('Returns undefined if no id string is given', () => {
      expect(extractIdFromGroup('rootId', '')).toBeUndefined();
    });
  });

  describe('findDirectChildIds', () => {
    it.each([true, false])(
      'Returns the child ids of a treeitem node when `aria-expanded` is %s',
      (expanded) => {
        const rootId = 'rootId';
        const rootItem1Id = 'rootItem1Id';
        const rootItem2Id = 'rootItem2Id';
        const subItem1AId = 'subItem1AId';
        const subItem1BId = 'subItem1BId';
        const subItem2AId = 'subItem2AId';
        const subItem2BId = 'subItem2BId';
        render(
          <ul role='tree' id={rootId}>
            {renderListItem(rootId, rootItem1Id, 'rootItem1', 1, expanded, [
              renderListItem(rootId, subItem1AId, 'subItem1A', 2),
              renderListItem(rootId, subItem1BId, 'subItem1B', 2),
            ])}
            {renderListItem(rootId, rootItem2Id, 'rootItem2', 1, expanded, [
              renderListItem(rootId, subItem2AId, 'subItem2A', 2),
              renderListItem(rootId, subItem2BId, 'subItem2B', 2),
            ])}
          </ul>,
        );
        expect(findDirectChildIds(rootId, rootItem1Id)).toEqual([subItem1AId, subItem1BId]);
        expect(findDirectChildIds(rootId, rootItem2Id)).toEqual([subItem2AId, subItem2BId]);
      },
    );

    it('Does not include grandchildren', () => {
      const rootId = 'rootId';
      const rootItemId = 'rootItemId';
      const subItem1Id = 'subItem1Id';
      const subItem2Id = 'subItem2Id';
      const subSubItem1Id = 'subSubItem1Id';
      const subSubItem2Id = 'subSubItem2Id';
      render(
        <ul role='tree' id={rootId}>
          {renderListItem(rootId, rootItemId, 'rootItem', 1, true, [
            renderListItem(rootId, subItem1Id, 'subItem1', 2, true, [
              renderListItem(rootId, subSubItem1Id, 'subSubItem1', 3),
            ]),
            renderListItem(rootId, subItem2Id, 'subItem1', 2, true, [
              renderListItem(rootId, subSubItem2Id, 'subSubItem2', 3),
            ]),
          ])}
        </ul>,
      );
      expect(findDirectChildIds(rootId, rootItemId)).toEqual([subItem1Id, subItem2Id]);
    });

    it('Returns an empty array if the node has no children', () => {
      const rootId = 'rootId';
      const rootItemId = 'rootItemId';
      render(
        <ul role='tree' id={rootId}>
          {renderListItem(rootId, rootItemId, 'rootItem', 1)}
        </ul>,
      );
      expect(findDirectChildIds(rootId, rootItemId)).toEqual([]);
    });

    it('Returns the root items if no parent id is given', () => {
      const rootId = 'rootId';
      const rootItem1Id = 'rootItem1Id';
      const rootItem2Id = 'rootItem2Id';
      render(
        <ul role='tree' id={rootId}>
          {renderListItem(rootId, rootItem1Id, 'rootItem1', 1, true)}
          {renderListItem(rootId, rootItem2Id, 'rootItem2', 1, true)}
        </ul>,
      );
      expect(findDirectChildIds(rootId)).toEqual([rootItem1Id, rootItem2Id]);
    });
  });

  describe('findParentId', () => {
    it('Returns the id of the parent node of the node with the given id', () => {
      const rootId = 'rootId';
      const rootItem1Id = 'rootItem1Id';
      const rootItem2Id = 'rootItem2Id';
      const subItem1AId = 'subItem1AId';
      const subItem1BId = 'subItem1BId';
      render(
        <ul role='tree' id={rootId}>
          {renderListItem(rootId, rootItem1Id, 'rootItem1', 1, true, [
            renderListItem(rootId, subItem1AId, 'subItem1A', 2),
            renderListItem(rootId, subItem1BId, 'subItem1B', 2),
          ])}
          {renderListItem(rootId, rootItem2Id, 'rootItem2', 1)}
        </ul>,
      );
      expect(findParentId(rootId, subItem1AId)).toBe(rootItem1Id);
      expect(findParentId(rootId, subItem1BId)).toBe(rootItem1Id);
    });

    it('Returns null if the node is a root item', () => {
      const rootId = 'rootId';
      const rootItem1Id = 'rootItem1Id';
      const rootItem2Id = 'rootItem2Id';
      render(
        <ul role='tree' id={rootId}>
          {renderListItem(rootId, rootItem1Id, 'rootItem1', 1)},
          {renderListItem(rootId, rootItem2Id, 'rootItem2', 1)}
        </ul>,
      );
      expect(findParentId(rootId, rootItem1Id)).toBeNull();
      expect(findParentId(rootId, rootItem2Id)).toBeNull();
    });
  });

  describe('findAllParentIds', () => {
    const rootId = 'rootId';
    const rootItemId = 'rootItem1Id';
    const subItemId = 'subItemId';
    const subSubItemId = 'subSubItemId';
    const subSubSubItemId = 'subSubSubItemId';
    const renderDom = () =>
      render(
        <ul role='tree' id={rootId}>
          {renderListItem(rootId, rootItemId, 'rootItem1', 1, true, [
            renderListItem(rootId, subItemId, 'subItem', 2, true, [
              renderListItem(rootId, subSubItemId, 'subSubItem', 3, true, [
                renderListItem(rootId, subSubSubItemId, 'subSubSubItem', 4),
              ]),
            ]),
          ])}
        </ul>,
      );

    it('Returns a list of all the parent ids of the node with the given id', () => {
      renderDom();
      expect(findAllParentIds(rootId, subSubSubItemId)).toEqual([
        subSubItemId,
        subItemId,
        rootItemId,
      ]);
    });

    it('Returns an empty array if the node is a root item', () => {
      renderDom();
      expect(findAllParentIds(rootId, rootItemId)).toEqual([]);
    });
  });

  describe('findAllNodeIds', () => {
    it('Returns a list of all the nodes in the order of appearance', () => {
      const rootId = 'rootId';
      const rootItem1Id = 'rootItem1Id';
      const rootItem2Id = 'rootItem2Id';
      const subItem1AId = 'subItem1AId';
      const subItem1BId = 'subItem1BId';
      const subItem2AId = 'subItem2AId';
      const subItem2BId = 'subItem2BId';
      render(
        <ul role='tree' id={rootId}>
          {renderListItem(rootId, rootItem1Id, 'rootItem1', 1, true, [
            renderListItem(rootId, subItem1AId, 'subItem1A', 2),
            renderListItem(rootId, subItem1BId, 'subItem1B', 2),
          ])}
          {renderListItem(rootId, rootItem2Id, 'rootItem2', 1, false, [
            renderListItem(rootId, subItem2AId, 'subItem2A', 2),
            renderListItem(rootId, subItem2BId, 'subItem2B', 2),
          ])}
        </ul>,
      );
      expect(findAllNodeIds(rootId)).toEqual([
        rootItem1Id,
        subItem1AId,
        subItem1BId,
        rootItem2Id,
        subItem2AId,
        subItem2BId,
      ]);
    });
  });

  describe('findAllVisibleNodeIds', () => {
    it('Returns a list of all the nodes that are not within a collapsed group in the order of appearance', () => {
      const rootId = 'rootId';
      const openItemId = 'openItemId';
      const subItemOfOpenItemId = 'subItemOfOpenItemId';
      const closedItemId = 'closedItemId';
      const subItemOfClosedItemId = 'subItemOfClosedItemId';
      render(
        <ul role='tree' id={rootId}>
          {renderListItem(rootId, openItemId, 'openItem', 1, true, [
            renderListItem(rootId, subItemOfOpenItemId, 'subItemOfOpenItem', 2),
          ])}
          {renderListItem(rootId, closedItemId, 'closedItem', 1, false, [
            renderListItem(rootId, subItemOfClosedItemId, 'subItemOfClosedItem', 2),
          ])}
        </ul>,
      );
      expect(findAllVisibleNodeIds(rootId)).toEqual([
        openItemId,
        subItemOfOpenItemId,
        closedItemId,
      ]);
    });

    it('Does not include items that are within an expanded group within a collapsed group', () => {
      const rootId = 'rootId';
      const closedItemId = 'openItemId';
      const openSubItemId = 'openSubItemId';
      const subSubItemId = 'subSubItemId';
      render(
        <ul role='tree' id={rootId}>
          {renderListItem(rootId, closedItemId, 'closedItem', 1, false, [
            renderListItem(rootId, openSubItemId, 'openSubItem', 2, true, [
              renderListItem(rootId, subSubItemId, 'subSubItem', 3),
            ]),
          ])}
        </ul>,
      );
      expect(findAllVisibleNodeIds(rootId)).toEqual([closedItemId]);
    });
  });

  describe('findFirstNodeId', () => {
    it('Returns the id of the first visible node', () => {
      const rootId = 'rootId';
      const firstItemId = 'firstItemId';
      const secondItemId = 'secondItemId';
      render(
        <ul role='tree' id={rootId}>
          {renderListItem(rootId, firstItemId, 'firstItem', 1, true)}
          {renderListItem(rootId, secondItemId, 'secondItem', 1, true)}
        </ul>,
      );
      expect(findFirstNodeId(rootId)).toBe(firstItemId);
    });

    it('Returns null if there are no nodes', () => {
      const rootId = 'rootId';
      render(<ul role='tree' id={rootId} />);
      expect(findFirstNodeId(rootId)).toBeNull();
    });
  });

  describe('findLastVisibleNodeId', () => {
    it('Returns the id of the last visible node', () => {
      const rootId = 'rootId';
      const firstItemId = 'firstItemId';
      const secondItemId = 'secondItemId';
      const subItemId = 'subItemId';
      const invisibleSubSubItemId = 'subSubItemId';
      render(
        <ul role='tree' id={rootId}>
          {renderListItem(rootId, firstItemId, 'firstItem', 1)}
          {renderListItem(rootId, secondItemId, 'secondItem', 1, true, [
            renderListItem(rootId, subItemId, 'subItem', 2, false, [
              renderListItem(rootId, invisibleSubSubItemId, 'subSubItem', 3),
            ]),
          ])}
        </ul>,
      );
      expect(findLastVisibleNodeId(rootId)).toBe(subItemId);
    });

    it('Returns null if there are no nodes', () => {
      const rootId = 'rootId';
      render(<ul role='tree' id={rootId} />);
      expect(findLastVisibleNodeId(rootId)).toBeNull();
    });
  });

  describe('findNextVisibleNodeId', () => {
    const rootId = 'rootId';
    const firstItemId = 'firstItemId';
    const secondItemId = 'secondItemId';
    const subItemId = 'subItemId';
    const invisibleSubSubItemId = 'subSubItemId';
    const thirdItemId = 'thirdItemId';
    const renderDom = () =>
      render(
        <ul role='tree' id={rootId}>
          {renderListItem(rootId, firstItemId, 'firstItem', 1)}
          {renderListItem(rootId, secondItemId, 'secondItem', 1, true, [
            renderListItem(rootId, subItemId, 'subItem', 2, false, [
              renderListItem(rootId, invisibleSubSubItemId, 'subSubItem', 3),
            ]),
          ])}
          {renderListItem(rootId, thirdItemId, 'thirdItem', 1)}
        </ul>,
      );

    it('Returns the id of the next visible node', () => {
      renderDom();
      expect(findNextVisibleNodeId(rootId, firstItemId)).toBe(secondItemId);
      expect(findNextVisibleNodeId(rootId, secondItemId)).toBe(subItemId);
      expect(findNextVisibleNodeId(rootId, subItemId)).toBe(thirdItemId);
    });

    it('Returns null if the given node is the last visible node', () => {
      renderDom();
      expect(findNextVisibleNodeId(rootId, thirdItemId)).toBeNull();
    });
  });

  describe('findPreviousVisibleNodeId', () => {
    const rootId = 'rootId';
    const firstItemId = 'firstItemId';
    const secondItemId = 'secondItemId';
    const subItemId = 'subItemId';
    const invisibleSubSubItemId = 'subSubItemId';
    const thirdItemId = 'thirdItemId';
    const renderDom = () =>
      render(
        <ul role='tree' id={rootId}>
          {renderListItem(rootId, firstItemId, 'firstItem', 1)}
          {renderListItem(rootId, secondItemId, 'secondItem', 1, true, [
            renderListItem(rootId, subItemId, 'subItem', 2, false, [
              renderListItem(rootId, invisibleSubSubItemId, 'subSubItem', 3),
            ]),
          ])}
          {renderListItem(rootId, thirdItemId, 'thirdItem', 1)}
        </ul>,
      );

    it('Returns the id of the previous visible node', () => {
      renderDom();
      expect(findPreviousVisibleNodeId(rootId, secondItemId)).toBe(firstItemId);
      expect(findPreviousVisibleNodeId(rootId, subItemId)).toBe(secondItemId);
      expect(findPreviousVisibleNodeId(rootId, thirdItemId)).toBe(subItemId);
    });

    it('Returns null if the given node is the first visible node', () => {
      renderDom();
      expect(findPreviousVisibleNodeId(rootId, firstItemId)).toBeNull();
    });
  });

  describe('findNodeIndexWithinGroup', () => {
    const rootId = 'rootId';
    const firstItemId = 'firstItemId';
    const secondItemId = 'secondItemId';
    const subItem2AId = 'subItem2AId';
    const subItem2BId = 'subItem2BId';
    const thirdItemId = 'thirdItemId';
    const renderDom = () =>
      render(
        <ul role='tree' id={rootId}>
          {renderListItem(rootId, firstItemId, 'firstItem', 1)}
          {renderListItem(rootId, secondItemId, 'secondItem', 1, true, [
            renderListItem(rootId, subItem2AId, 'subItem2A', 2),
            renderListItem(rootId, subItem2BId, 'subItem2B', 2),
          ])}
          {renderListItem(rootId, thirdItemId, 'thirdItem', 1)}
        </ul>,
      );

    it('Returns the index of the node within its group', () => {
      renderDom();
      expect(findNodeIndexWithinGroup(rootId, subItem2AId)).toBe(0);
      expect(findNodeIndexWithinGroup(rootId, subItem2BId)).toBe(1);
    });

    it('Returns the correct index when the given node is a root node', () => {
      renderDom();
      expect(findNodeIndexWithinGroup(rootId, firstItemId)).toBe(0);
      expect(findNodeIndexWithinGroup(rootId, secondItemId)).toBe(1);
      expect(findNodeIndexWithinGroup(rootId, thirdItemId)).toBe(2);
    });
  });

  describe('hasChildNodes', () => {
    it.each([true, false])(
      'Returns true if the node has children and when `aria-expanded` is %s',
      (expanded) => {
        const rootId = 'rootId';
        const rootItemId = 'rootItemId';
        render(
          <ul role='tree' id={rootId}>
            {renderListItem(rootId, rootItemId, 'rootItem', 1, expanded, [
              renderListItem(rootId, 'childItemId', 'childItem', 2),
            ])}
          </ul>,
        );
        expect(hasChildNodes(rootId, rootItemId)).toBe(true);
      },
    );

    it('Returns false if the node has no children', () => {
      const rootId = 'rootId';
      const rootItemId = 'rootItemId';
      render(
        <ul role='tree' id={rootId}>
          {renderListItem(rootId, rootItemId, 'rootItem', 1)}
        </ul>,
      );
      expect(hasChildNodes(rootId, rootItemId)).toBe(false);
    });
  });

  describe('findFirstChildId', () => {
    it('Returns the id of the first child node ', () => {
      const rootId = 'rootId';
      const rootItemId = 'rootItemId';
      const firstChildId = 'firstChildId';
      const secondChildId = 'secondChildId';
      render(
        <ul role='tree' id={rootId}>
          {renderListItem(rootId, rootItemId, 'rootItem', 1, true, [
            renderListItem(rootId, firstChildId, 'firstChild', 2),
            renderListItem(rootId, secondChildId, 'secondChild', 2),
          ])}
        </ul>,
      );
      expect(findFirstChildId(rootId, rootItemId)).toBe(firstChildId);
    });

    it('Returns null if the node has no children', () => {
      const rootId = 'rootId';
      const emptyItemId = 'emptyItemId';
      render(
        <ul role='tree' id={rootId}>
          {renderListItem(rootId, emptyItemId, 'emptyIem', 1)}
        </ul>,
      );
      expect(findFirstChildId(rootId, emptyItemId)).toBeNull();
    });
  });
});

const renderListItem = (
  rootId: string,
  id: string,
  label: string,
  level: number,
  expanded?: boolean,
  children?: ReactNode[],
): ReactNode => (
  <li key={id}>
    <button
      aria-expanded={expanded}
      aria-level={level}
      id={makeDomTreeItemId(rootId, id)}
      role='treeitem'
    >
      {label}
    </button>
    {children && (
      <ul role='group' id={makeDomGroupId(rootId, id)}>
        {children}
      </ul>
    )}
  </li>
);
