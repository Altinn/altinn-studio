import type { ReactNode } from 'react';
import React from 'react';
import { DragAndDropList } from './';
import type { DragAndDropListItemContextProps } from '../DragAndDropListItem/DragAndDropListItemContext';
import { DragAndDropListItemContext } from '../DragAndDropListItem/DragAndDropListItemContext';
import type { DragAndDropRootContextProps } from '../DragAndDropProvider/DragAndDropRootContext';
import { DragAndDropRootContext } from '../DragAndDropProvider/DragAndDropRootContext';
import { render as renderRtl } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { domListClass, domListId } from 'app-shared/components/dragAndDrop/utils/domUtils';

//
const itemId = 'id';
const rootId = 'rootId';
const uniqueDomId = ':r0:';
const onDrop = jest.fn();
const gap = '1rem';
const defaultlistItemContextProps: DragAndDropListItemContextProps = {
  isDisabled: false,
  itemId,
};
const defaultRootContextProps: DragAndDropRootContextProps<string> = {
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
  listItemContextProps?: Partial<DragAndDropListItemContextProps>;
  rootContextProps?: Partial<DragAndDropRootContextProps<string>>;
}

function render({ listItemContextProps = {}, rootContextProps = {} }: RenderProps = {}) {
  return (children: ReactNode) =>
    renderRtl(
      <DndProvider backend={HTML5Backend}>
        <DragAndDropRootContext.Provider
          value={{ ...rootContextProps, ...defaultRootContextProps }}
        >
          <DragAndDropListItemContext.Provider
            value={{ ...listItemContextProps, ...defaultlistItemContextProps }}
          >
            <DragAndDropList>{children}</DragAndDropList>
          </DragAndDropListItemContext.Provider>
        </DragAndDropRootContext.Provider>
      </DndProvider>,
    );
}
