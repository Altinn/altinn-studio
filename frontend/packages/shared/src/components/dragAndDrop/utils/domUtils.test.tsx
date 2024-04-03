import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import {
  domItemClass,
  domItemId,
  domListClass,
  domListId,
  extractIdFromDomItemId,
  extractIdFromDomListId,
  findAllItemIds,
  findDirectChildDomIds,
  findParentId,
  findPositionInList,
} from 'app-shared/components/dragAndDrop/utils/domUtils';

// Test data:
const defaultBaseId = ':baseId:';

interface TestComponentProps {
  baseId?: string;
  id: string;
  children?: ReactNode;
}

const List = ({ baseId = defaultBaseId, id, children }: TestComponentProps) => (
  <div className={domListClass(baseId)} id={domListId(baseId, id)}>
    {children}
  </div>
);
const Item = ({ baseId = defaultBaseId, id, children }: TestComponentProps) => (
  <div className={domItemClass(baseId)} id={domItemId(baseId, id)}>
    {children}
  </div>
);

describe('domUtils', () => {
  describe('domListId', () => {
    it('Returns an id with the expected format', () => {
      const id = 'id';
      expect(domListId(defaultBaseId, id)).toEqual(`${defaultBaseId}-${id}-list`);
    });
  });

  describe('domItemId', () => {
    it('Returns an id with the expected format', () => {
      const id = 'id';
      expect(domItemId(defaultBaseId, id)).toEqual(`${defaultBaseId}-${id}-listitem`);
    });
  });

  describe('extractIdFromDomListId', () => {
    it('Returns the id when it has been formatted by domListId', () => {
      const id1 = 'test1';
      const id2 = 'test2';
      expect(extractIdFromDomListId(defaultBaseId, domListId(defaultBaseId, id1))).toEqual(id1);
      expect(extractIdFromDomListId(defaultBaseId, domListId(defaultBaseId, id2))).toEqual(id2);
    });
  });

  describe('extractIdFromDomItemId', () => {
    it('Returns the id when it has been formatted by domItemId', () => {
      const id1 = 'test1';
      const id2 = 'test2';
      expect(extractIdFromDomItemId(defaultBaseId, domItemId(defaultBaseId, id1))).toEqual(id1);
      expect(extractIdFromDomItemId(defaultBaseId, domItemId(defaultBaseId, id2))).toEqual(id2);
    });
  });

  describe('domListClass', () => {
    it('Returns a class name with the expected format', () => {
      expect(domListClass(':baseId:')).toEqual(`_baseId_-list`);
    });
  });

  describe('domItemClass', () => {
    it('Returns a class name with the expected format', () => {
      expect(domItemClass(':baseId:')).toEqual(`_baseId_-listitem`);
    });
  });

  describe('findParentId', () => {
    it('Returns the id of the parent listitem element', () => {
      const parentId = 'parentId';
      const childId = 'childId';
      render(
        <List id={parentId}>
          <Item id={childId} />
        </List>,
      );
      expect(findParentId(defaultBaseId, childId)).toEqual(parentId);
    });

    it('Returns the correct id when there are multiple layers of dom elements between the parent and the child', () => {
      const parentId = 'parentId';
      const childId = 'childId';
      render(
        <List id={parentId}>
          <div>
            <div id='irrelevant'>
              <div>
                <Item id={childId} />
              </div>
            </div>
          </div>
        </List>,
      );
      expect(findParentId(defaultBaseId, childId)).toEqual(parentId);
    });

    it('Returns the ID of the closest parent listitem element', () => {
      const parentId = 'parentId';
      const childId = 'childId';
      render(
        <List id='grandparent'>
          <Item id={parentId}>
            <List id={parentId}>
              <Item id={childId} />
            </List>
          </Item>
        </List>,
      );
      expect(findParentId(defaultBaseId, childId)).toEqual(parentId);
    });
  });

  describe('findAllItemIds', () => {
    it('Returns a list of all list and/or item ids', () => {
      const rootId = 'rootId';
      const parent1Id = 'parent1Id';
      const parent2Id = 'parent2Id';
      const child1AId = 'child1AId';
      const child1BId = 'child1BId';
      const child2AId = 'child2AId';
      const child2BId = 'child2BId';
      render(
        <List id={rootId}>
          <Item id={parent1Id}>
            <List id={parent1Id}>
              <Item id={child1AId} />
              <Item id={child1BId} />
            </List>
          </Item>
          <Item id={parent2Id}>
            <List id={parent2Id}>
              <Item id={child2AId} />
              <Item id={child2BId} />
            </List>
          </Item>
        </List>,
      );
      expect(findAllItemIds(defaultBaseId)).toEqual([
        parent1Id,
        child1AId,
        child1BId,
        parent2Id,
        child2AId,
        child2BId,
      ]);
    });

    it('Ignores lists with other base ids', () => {
      const rootId = 'rootId';
      const baseId1 = 'baseId1';
      const itemId1 = 'itemId1';
      const baseId2 = 'baseId2';
      const itemId2 = 'itemId2';
      render(
        <>
          <List baseId={baseId1} id={rootId}>
            <Item baseId={baseId1} id={itemId1} />
          </List>
          <List baseId={baseId2} id={rootId}>
            <Item baseId={baseId2} id={itemId2} />
          </List>
        </>,
      );
      expect(findAllItemIds(baseId1)).toEqual([itemId1]);
      expect(findAllItemIds(baseId2)).toEqual([itemId2]);
    });
  });

  describe('findDirectChildIds', () => {
    it('Returns a list of all direct child ids', () => {
      const rootId = 'rootId';
      const item1Id = 'item1Id';
      const item2Id = 'item2Id';
      const item1AId = 'item1AId';
      const item1BId = 'item1BId';
      const item1A1Id = 'item1A1Id';
      render(
        <List id={rootId}>
          <Item id={item1Id}>
            <List id={item1Id}>
              <Item id={item1AId}>
                <List id={item1AId}>
                  <Item id={item1A1Id} />
                </List>
              </Item>
              <Item id={item1BId} />
            </List>
          </Item>
          <Item id={item2Id} />
        </List>,
      );
      expect(findDirectChildDomIds(defaultBaseId, rootId)).toEqual([item1Id, item2Id]);
      expect(findDirectChildDomIds(defaultBaseId, item1Id)).toEqual([item1AId, item1BId]);
      expect(findDirectChildDomIds(defaultBaseId, item1AId)).toEqual([item1A1Id]);
    });
  });

  describe('findPositionInList', () => {
    const rootId = 'rootId';
    const item1Id = 'item1Id';
    const item2Id = 'item2Id';
    const item3Id = 'item3Id';

    it('Returns the position of the item in the list', () => {
      render(
        <List id={rootId}>
          <Item id={item1Id} />
          <Item id={item2Id} />
          <Item id={item3Id} />
        </List>,
      );
      expect(findPositionInList(defaultBaseId, item1Id)).toEqual(0);
      expect(findPositionInList(defaultBaseId, item2Id)).toEqual(1);
      expect(findPositionInList(defaultBaseId, item3Id)).toEqual(2);
    });

    it('Returns the correct position when run on a complex composition', () => {
      render(
        <List id={rootId}>
          <Item id={item1Id} />
          <div>Something in between</div>
          <Item id={item2Id} />
          <div>
            <Item id={item3Id} />
          </div>
        </List>,
      );
      expect(findPositionInList(defaultBaseId, item1Id)).toEqual(0);
      expect(findPositionInList(defaultBaseId, item2Id)).toEqual(1);
      expect(findPositionInList(defaultBaseId, item3Id)).toEqual(2);
    });
  });
});
