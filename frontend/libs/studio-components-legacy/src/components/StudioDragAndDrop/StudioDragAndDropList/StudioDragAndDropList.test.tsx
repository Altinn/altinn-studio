import type { ReactNode } from 'react';
import React from 'react';
import { StudioDragAndDropList } from './';
import type { StudioDragAndDropListItemContextProps } from '../StudioDragAndDropListItem/StudioDragAndDropListItemContext';
import { StudioDragAndDropListItemContext } from '../StudioDragAndDropListItem/StudioDragAndDropListItemContext';
import type { StudioDragAndDropRootContextProps } from '../StudioDragAndDropProvider/StudioDragAndDropRootContext';
import { StudioDragAndDropRootContext } from '../StudioDragAndDropProvider/StudioDragAndDropRootContext';
import { render as renderRtl } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { domListClass, domListId } from '../utils/domUtils';

const itemId = 'id';
const rootId = 'rootId';
const uniqueDomId = ':r0:';
const onDrop = jest.fn();
const gap = '1rem';
const defaultListItemContextProps: StudioDragAndDropListItemContextProps = {
  isDisabled: false,
  itemId,
};
const defaultRootContextProps: StudioDragAndDropRootContextProps<string> = {
  gap,
  onDrop,
  rootId,
  uniqueDomId,
};

/* eslint-disable testing-library/no-node-access */
describe('DragAndDropList', () => {
  it('Renders with correct id and class name', () => {
    const { container } = render()(<div />);
    const expectedId = domListId(uniqueDomId, itemId);
    const expectedClass = domListClass(uniqueDomId);
    expect(container.firstChild).toHaveAttribute('id', expectedId);
    expect(container.firstChild).toHaveClass(expectedClass);
  });
});

interface RenderProps {
  listItemContextProps?: Partial<StudioDragAndDropListItemContextProps>;
  rootContextProps?: Partial<StudioDragAndDropRootContextProps<string>>;
}

function render({ listItemContextProps = {}, rootContextProps = {} }: RenderProps = {}) {
  return (children: ReactNode) =>
    renderRtl(
      <DndProvider backend={HTML5Backend}>
        <StudioDragAndDropRootContext.Provider
          value={{ ...rootContextProps, ...defaultRootContextProps }}
        >
          <StudioDragAndDropListItemContext.Provider
            value={{ ...listItemContextProps, ...defaultListItemContextProps }}
          >
            <StudioDragAndDropList>{children}</StudioDragAndDropList>
          </StudioDragAndDropListItemContext.Provider>
        </StudioDragAndDropRootContext.Provider>
      </DndProvider>,
    );
}
