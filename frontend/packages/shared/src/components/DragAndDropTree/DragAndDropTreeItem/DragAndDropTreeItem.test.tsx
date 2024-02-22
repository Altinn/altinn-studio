/* eslint-disable testing-library/no-container, testing-library/no-node-access, react/display-name  */
import React from 'react';
import { render as renderRtl, screen } from '@testing-library/react';
import { DragAndDropTreeItem, type DragAndDropTreeItemProps } from './DragAndDropTreeItem';
import {
  DragAndDropTreeRootContext,
  type DragAndDropTreeRootContextProps,
} from '../DragAndDropTreeRoot';
import { DragAndDropTreeProvider } from '../DragAndDropTreeProvider';
import {
  DragAndDropTreeItemContext,
  type DragAndDropTreeItemContextProps,
} from './DragAndDropTreeItemContext';
import { StudioTreeView } from '@studio/components';

// Test data:
const label = 'Test';
const nodeId = 'node';
const parentId = 'parent';
const onAdd = jest.fn();
const onMove = jest.fn();
const rootId = 'rootId';
const hoveredNodeParent = null;
const setHoveredNodeParent = jest.fn();
const defaultProps: DragAndDropTreeItemProps = { label, nodeId };
const defaultItemContextProps: DragAndDropTreeItemContextProps = { nodeId: parentId };
const defaultRootContextProps: DragAndDropTreeRootContextProps = {
  hoveredNodeParent,
  setHoveredNodeParent,
};

interface RenderProps {
  props?: Partial<DragAndDropTreeItemProps>;
  itemContextProps?: Partial<DragAndDropTreeItemContextProps>;
  rootContextProps?: Partial<DragAndDropTreeRootContextProps>;
}

type RenderWrapperProps = Omit<RenderProps, 'props'>;

const wrapper =
  ({ itemContextProps = {}, rootContextProps = {} }: RenderWrapperProps = {}) =>
  (
    { children }, // eslint-disable-line react/prop-types
  ) => (
    <DragAndDropTreeProvider onAdd={onAdd} onMove={onMove} rootId={rootId}>
      <DragAndDropTreeRootContext.Provider
        value={{ ...defaultRootContextProps, ...rootContextProps }}
      >
        <StudioTreeView.Root>
          <DragAndDropTreeItemContext.Provider
            value={{ ...defaultItemContextProps, ...itemContextProps }}
          >
            {children}
          </DragAndDropTreeItemContext.Provider>
        </StudioTreeView.Root>
      </DragAndDropTreeRootContext.Provider>
    </DragAndDropTreeProvider>
  );
const render = ({ props = {}, itemContextProps = {}, rootContextProps = {} }: RenderProps = {}) =>
  renderRtl(<DragAndDropTreeItem {...defaultProps} {...props} />, {
    wrapper: wrapper({ itemContextProps, rootContextProps }),
  });

// Mocks:
jest.mock('./DragAndDropTreeItem.module.css', () => ({
  item: 'item',
  hasHoveredItem: 'hasHoveredItem',
}));

describe('DragAndDropTreeItem', () => {
  it('Renders a treeitem with the given label', () => {
    render();
    expect(screen.getByRole('treeitem', { name: label })).toBeInTheDocument();
  });

  it('Does not have the hasHoveredItem class name by default', () => {
    const { container } = render();
    const item = container.querySelector('.item');
    expect(item).not.toHaveClass('hasHoveredItem');
  });

  it('Has the hasHoveredItem class name if hoveredNodeParent matches nodeId', () => {
    const { container } = render({ rootContextProps: { hoveredNodeParent: nodeId } });
    const item = container.querySelector('.item');
    expect(item).toHaveClass('hasHoveredItem');
  });

  it('Does not display the empty message by default', () => {
    const emptyMessage = 'Empty';
    render({ props: { emptyMessage } });
    expect(screen.queryByText(emptyMessage)).not.toBeInTheDocument();
  });

  it('Displays the empty message when the component is expandable and there are no children', () => {
    const emptyMessage = 'Empty';
    render({ props: { expandable: true, emptyMessage } });
    expect(screen.getByText(emptyMessage)).toBeInTheDocument();
  });

  it('Does not display the empty message when the component is expandable and there are subitems', () => {
    const emptyMessage = 'Empty';
    const children = <DragAndDropTreeItem label='Sub-item' nodeId='subitem' />;
    render({ props: { expandable: true, emptyMessage, children } });
    expect(screen.queryByText(emptyMessage)).not.toBeInTheDocument();
  });
});
