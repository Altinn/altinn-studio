/* eslint-disable testing-library/no-container, testing-library/no-node-access, react/display-name  */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { StudioDragAndDropTreeItemProps } from './StudioDragAndDropTreeItem';
import { StudioDragAndDropTreeItem } from './StudioDragAndDropTreeItem';
import type { StudioDragAndDropTreeRootContextProps } from '../StudioDragAndDropTreeRoot';
import { StudioDragAndDropTreeRootContext } from '../StudioDragAndDropTreeRoot';
import { StudioDragAndDropTreeProvider } from '../StudioDragAndDropTreeProvider';
import type { StudioDragAndDropTreeItemContextProps } from './StudioDragAndDropTreeItemContext';
import { StudioDragAndDropTreeItemContext } from './StudioDragAndDropTreeItemContext';
import { StudioTreeView } from '../../StudioTreeView';

// Test data:
const label = 'Test';
const nodeId = 'node';
const parentId = 'parent';
const onAdd = jest.fn();
const onMove = jest.fn();
const rootId = 'rootId';
const hoveredNodeParent = null;
const setHoveredNodeParent = jest.fn();
const defaultProps: StudioDragAndDropTreeItemProps = { label, nodeId };
const defaultItemContextProps: StudioDragAndDropTreeItemContextProps = { nodeId: parentId };
const defaultRootContextProps: StudioDragAndDropTreeRootContextProps = {
  hoveredNodeParent,
  setHoveredNodeParent,
};

interface RenderProps {
  props?: Partial<StudioDragAndDropTreeItemProps>;
  itemContextProps?: Partial<StudioDragAndDropTreeItemContextProps>;
  rootContextProps?: Partial<StudioDragAndDropTreeRootContextProps>;
}

type RenderWrapperProps = Omit<RenderProps, 'props'>;

const wrapper =
  ({ itemContextProps = {}, rootContextProps = {} }: RenderWrapperProps = {}) =>
  (
    { children }, // eslint-disable-line react/prop-types
  ) => (
    <StudioDragAndDropTreeProvider onAdd={onAdd} onMove={onMove} rootId={rootId}>
      <StudioDragAndDropTreeRootContext.Provider
        value={{ ...defaultRootContextProps, ...rootContextProps }}
      >
        <StudioTreeView.Root>
          <StudioDragAndDropTreeItemContext.Provider
            value={{ ...defaultItemContextProps, ...itemContextProps }}
          >
            {children}
          </StudioDragAndDropTreeItemContext.Provider>
        </StudioTreeView.Root>
      </StudioDragAndDropTreeRootContext.Provider>
    </StudioDragAndDropTreeProvider>
  );
const renderStudioDragAndDropTreeItem = ({
  props = {},
  itemContextProps = {},
  rootContextProps = {},
}: RenderProps = {}) =>
  render(<StudioDragAndDropTreeItem {...defaultProps} {...props} />, {
    wrapper: wrapper({ itemContextProps, rootContextProps }),
  });

// Mocks:
jest.mock('./StudioDragAndDropTreeItem.module.css', () => ({
  item: 'item',
  hasHoveredItem: 'hasHoveredItem',
}));

describe('StudioDragAndDropTreeItem', () => {
  it('Renders a treeitem with the given label', () => {
    renderStudioDragAndDropTreeItem();
    expect(screen.getByRole('treeitem', { name: label })).toBeInTheDocument();
  });

  it('Does not have the hasHoveredItem class name by default', () => {
    const { container } = renderStudioDragAndDropTreeItem();
    const item = container.querySelector('.item');
    expect(item).not.toHaveClass('hasHoveredItem');
  });

  it('Has the hasHoveredItem class name if hoveredNodeParent matches nodeId', () => {
    const { container } = renderStudioDragAndDropTreeItem({
      rootContextProps: { hoveredNodeParent: nodeId },
    });
    const item = container.querySelector('.item');
    expect(item).toHaveClass('hasHoveredItem');
  });

  it('Does not display the empty message by default', () => {
    const emptyMessage = 'Empty';
    renderStudioDragAndDropTreeItem({ props: { emptyMessage } });
    expect(screen.queryByText(emptyMessage)).not.toBeInTheDocument();
  });

  it('Displays the empty message when the component is expandable and there are no children', () => {
    const emptyMessage = 'Empty';
    renderStudioDragAndDropTreeItem({ props: { expandable: true, emptyMessage } });
    expect(screen.getByText(emptyMessage)).toBeInTheDocument();
  });

  it('Does not display the empty message when the component is expandable and there are subitems', () => {
    const emptyMessage = 'Empty';
    const children = <StudioDragAndDropTreeItem label='Sub-item' nodeId='subitem' />;
    renderStudioDragAndDropTreeItem({ props: { expandable: true, emptyMessage, children } });
    expect(screen.queryByText(emptyMessage)).not.toBeInTheDocument();
  });
});
