import React from 'react';
import type { StudioTreeViewItemProps } from './StudioTreeViewItem';
import type { ByRoleOptions } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { StudioTreeViewItem } from './StudioTreeViewItem';
import type { TreeViewRootContextProps } from '../StudioTreeViewRoot';
import { StudioTreeViewRootContext } from '../StudioTreeViewRoot';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

// Test data:
const label = 'label';
const nodeId = 'nodeId';
const defaultProps: StudioTreeViewItemProps = {
  label,
  nodeId,
};
const rootId = 'rootId';
const setFocusedId = jest.fn();
const setSelectedId = jest.fn();
const focusableId = 'focusableId';
const defaultRootContextProps: TreeViewRootContextProps = {
  rootId,
  setFocusedId,
  setSelectedId,
  focusableId,
};

const renderItem = (
  props: Partial<StudioTreeViewItemProps> = {},
  rootContextProps: Partial<TreeViewRootContextProps> = {},
) =>
  render(
    <StudioTreeViewRootContext.Provider value={{ ...defaultRootContextProps, ...rootContextProps }}>
      <StudioTreeViewItem {...defaultProps} {...props} />
    </StudioTreeViewRootContext.Provider>,
  );

describe('StudioTreeViewItem', () => {
  afterEach(jest.clearAllMocks);

  it('Renders a treeitem component with the given label', () => {
    renderItem({ label });
    expect(getTreeItem({ name: label })).toBeInTheDocument();
  });

  it('Does not have focus and is not focusable by default', () => {
    renderItem({ label });
    expect(getTreeItem({ name: label })).not.toHaveFocus();
  });

  it('Focuses the treeitem when focusedId matches nodeId', () => {
    renderItem({ label }, { focusedId: nodeId });
    expect(getTreeItem({ name: label })).toHaveFocus();
  });

  it('Is not selected by default', () => {
    renderItem({ label });
    expect(getTreeItem({ name: label, selected: false })).toBeInTheDocument();
  });

  it('Is selected when selectedId matches nodeId', () => {
    renderItem({ label }, { selectedId: nodeId });
    expect(getTreeItem({ name: label, selected: true })).toBeInTheDocument();
  });

  it('Has level 1 by default', () => {
    renderItem({ label });
    expect(getTreeItem({ name: label })).toHaveAttribute('aria-level', '1');
  });

  it('Has no `aria-expanded` attribute if it has no children', () => {
    renderItem({ label });
    expect(getTreeItem({ name: label })).not.toHaveAttribute('aria-expanded');
  });

  it('Does not render a group component if no children are provided', () => {
    renderItem({ label });
    expect(screen.queryByRole('group', { hidden: true })).not.toBeInTheDocument();
  });

  it('Renders a hidden group component owned by the tree item if children are provided', () => {
    renderItem({ label, children: <StudioTreeViewItem nodeId='child' label='Test' /> });
    const group = screen.getByRole('group', { hidden: true });
    expect(group).toBeInTheDocument();
    expect(getTreeItem({ name: label })).toHaveAttribute('aria-owns', group.id);
    expect(screen.queryByRole('group')).not.toBeInTheDocument(); // Not visible
  });

  it('Expands the tree item when it is clicked and closes it again when it is clicked again', async () => {
    renderItem({ label, children: <StudioTreeViewItem nodeId='child' label='Test' /> });
    expect(getTreeItem({ name: label, expanded: false })).toBeInTheDocument();
    await user.click(getTreeItem());
    expect(getTreeItem({ name: label, expanded: true })).toBeInTheDocument();
    expect(screen.getByRole('group')).toBeInTheDocument();
    await user.click(getTreeItem());
    expect(getTreeItem({ name: label, expanded: false })).toBeInTheDocument();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('Increases the `aria-level` attribute of its children by one', () => {
    const level2Label = 'Test';
    const level3Label = 'Subtest';
    renderItem({
      label,
      children: (
        <StudioTreeViewItem nodeId='child' label={level2Label}>
          <StudioTreeViewItem nodeId='grandchild' label={level3Label} />
        </StudioTreeViewItem>
      ),
    });
    expect(getTreeItem({ name: level2Label, hidden: true })).toHaveAttribute('aria-level', '2');
    expect(getTreeItem({ name: level3Label, hidden: true })).toHaveAttribute('aria-level', '3');
  });

  it('Calls the `setSelectedId` and `setFocusedId` callbacks with the `nodeId` when clicked', async () => {
    renderItem({ label });
    await user.click(getTreeItem({ name: label }));
    expect(setSelectedId).toHaveBeenCalledTimes(1);
    expect(setSelectedId).toHaveBeenCalledWith(nodeId);
    expect(setFocusedId).toHaveBeenCalledTimes(1);
    expect(setFocusedId).toHaveBeenCalledWith(nodeId);
  });

  it('Calls the `setFocusedId` callback with the `nodeId` when focused', () => {
    renderItem({ label });
    getTreeItem({ name: label }).focus();
    expect(setFocusedId).toHaveBeenCalledTimes(1);
    expect(setFocusedId).toHaveBeenCalledWith(nodeId);
  });

  it('Renders as a `li` element by default', () => {
    const { container } = renderItem();
    expect(container.firstChild).toBe(container.querySelector('li')); // eslint-disable-line testing-library/no-node-access, testing-library/no-container
  });

  it('Supports polymorphism', () => {
    const { container } = renderItem({ as: 'div' });
    expect(container.firstChild).toBe(container.querySelector('div')); // eslint-disable-line testing-library/no-node-access, testing-library/no-container
  });

  it('Renders with the treeitem button inside the given label wrapper', () => {
    const labelWrapperTestId = 'label-wrapper';
    renderItem({
      label,
      labelWrapper: (children) => <div data-testid={labelWrapperTestId}>{children}</div>,
    });
    const wrapper = screen.getByTestId(labelWrapperTestId);
    expect(wrapper).toBeInTheDocument();
    expect(getTreeItem({ name: label })).toBe(wrapper.querySelector('[role="treeitem"]')); // eslint-disable-line testing-library/no-node-access
  });

  it('Opens the tree item when a child is selected', async () => {
    const childLabel = 'directchild';
    const childId = 'child';
    renderItem(
      {
        label,
        children: <StudioTreeViewItem nodeId={childId} label={childLabel} />,
      },
      { selectedId: childId },
    );
    await user.click(getTreeItem({ name: childLabel, hidden: true }));
    expect(setSelectedId).toHaveBeenCalledTimes(1);
    expect(setSelectedId).toHaveBeenCalledWith(childId);
    expect(getTreeItem({ name: label, expanded: true })).toBeInTheDocument();
  });

  const getTreeItem = (options: ByRoleOptions = {}) => {
    const allOptions: ByRoleOptions = { name: label, ...options };
    allOptions.name = RegExp(`^${allOptions.name}( |$)`);
    return screen.getByRole('treeitem', allOptions);
  };
});
