import React from 'react';
import type { DragAndDropListItemProps } from './DragAndDropListItem';
import { DragAndDropListItem } from './DragAndDropListItem';
import type { DragAndDropListItemContextProps } from './DragAndDropListItemContext';
import { DragAndDropListItemContext } from './DragAndDropListItemContext';
import type { DragAndDropRootContextProps } from '../DragAndDropProvider/DragAndDropRootContext';
import { DragAndDropRootContext } from '../DragAndDropProvider/DragAndDropRootContext';
import { render as renderRtl } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { domItemClass, domItemId } from 'app-shared/components/dragAndDrop/utils/domUtils';

//
const itemId = 'id';
const parentId = 'parentId';
const rootId = 'rootId';
const uniqueDomId = ':r0:';
const onDrop = jest.fn();
const renderItem = () => <div>test</div>;
const gap = '1rem';
const defaultlistItemProps: DragAndDropListItemProps = {
  itemId,
  renderItem,
};
const defaultlistItemContextProps: DragAndDropListItemContextProps = {
  isDisabled: false,
  itemId: parentId,
};
const defaultRootContextProps: DragAndDropRootContextProps<string> = {
  gap,
  onDrop,
  rootId,
  uniqueDomId,
};

/* eslint-disable testing-library/no-node-access */
describe('DragAndDropListItem', () => {
  it('Renders with correct id and class name', () => {
    const { container } = render();
    const expectedId = domItemId(uniqueDomId, itemId);
    const expectedClass = domItemClass(uniqueDomId);
    expect(container.firstChild).toHaveAttribute('id', expectedId);
    expect(container.firstChild).toHaveClass(expectedClass);
  });
});

interface RenderProps {
  listItemProps?: Partial<DragAndDropListItemProps>;
  listItemContextProps?: Partial<DragAndDropListItemContextProps>;
  rootContextProps?: Partial<DragAndDropRootContextProps<string>>;
}

function render({
  listItemProps = {},
  listItemContextProps = {},
  rootContextProps = {},
}: RenderProps = {}) {
  return renderRtl(
    <DndProvider backend={HTML5Backend}>
      <DragAndDropRootContext.Provider value={{ ...rootContextProps, ...defaultRootContextProps }}>
        <DragAndDropListItemContext.Provider
          value={{ ...listItemContextProps, ...defaultlistItemContextProps }}
        >
          <DragAndDropListItem<string> {...listItemProps} {...defaultlistItemProps} />
        </DragAndDropListItemContext.Provider>
      </DragAndDropRootContext.Provider>
    </DndProvider>,
  );
}
