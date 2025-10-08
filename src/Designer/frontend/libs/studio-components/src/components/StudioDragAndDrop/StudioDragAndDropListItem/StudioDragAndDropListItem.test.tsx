import React from 'react';
import type { StudioDragAndDropListItemProps } from './StudioDragAndDropListItem';
import { StudioDragAndDropListItem } from './StudioDragAndDropListItem';
import type { StudioDragAndDropListItemContextProps } from './StudioDragAndDropListItemContext';
import { StudioDragAndDropListItemContext } from './StudioDragAndDropListItemContext';
import type { StudioDragAndDropRootContextProps } from '../StudioDragAndDropProvider/StudioDragAndDropRootContext';
import { StudioDragAndDropRootContext } from '../StudioDragAndDropProvider/StudioDragAndDropRootContext';
import { render as renderRtl } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { domItemClass, domItemId } from '../utils/domUtils';

const itemId = 'id';
const parentId = 'parentId';
const rootId = 'rootId';
const uniqueDomId = ':r0:';
const onDrop = jest.fn();
const renderItem = (): React.JSX.Element => <div>test</div>;
const gap = '1rem';
const defaultlistItemProps: StudioDragAndDropListItemProps = {
  itemId,
  renderItem,
};
const defaultListItemContextProps: StudioDragAndDropListItemContextProps = {
  isDisabled: false,
  itemId: parentId,
};
const defaultRootContextProps: StudioDragAndDropRootContextProps<string> = {
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
  listItemProps?: Partial<StudioDragAndDropListItemProps>;
  listItemContextProps?: Partial<StudioDragAndDropListItemContextProps>;
  rootContextProps?: Partial<StudioDragAndDropRootContextProps<string>>;
}

function render({
  listItemProps = {},
  listItemContextProps = {},
  rootContextProps = {},
}: RenderProps = {}): ReturnType<typeof renderRtl> {
  return renderRtl(
    <DndProvider backend={HTML5Backend}>
      <StudioDragAndDropRootContext.Provider
        value={{ ...rootContextProps, ...defaultRootContextProps }}
      >
        <StudioDragAndDropListItemContext.Provider
          value={{ ...listItemContextProps, ...defaultListItemContextProps }}
        >
          <StudioDragAndDropListItem<string> {...listItemProps} {...defaultlistItemProps} />
        </StudioDragAndDropListItemContext.Provider>
      </StudioDragAndDropRootContext.Provider>
    </DndProvider>,
  );
}
