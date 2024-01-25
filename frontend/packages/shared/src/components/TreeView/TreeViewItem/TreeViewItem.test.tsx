import React from 'react';
import type { TreeViewItemProps } from './TreeViewItem';
import type { ByRoleOptions } from '@testing-library/react';
import { act, render as renderRtl, screen } from '@testing-library/react';
import { TreeViewItem } from './TreeViewItem';
import type { TreeViewRootContextProps } from '../TreeViewRoot';
import { TreeViewRootContext } from '../TreeViewRoot';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

// Test data:
const label = 'label';
const nodeId = 'nodeId';
const defaultProps: TreeViewItemProps = {
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

const render = (
  props: Partial<TreeViewItemProps> = {},
  rootContextProps: Partial<TreeViewRootContextProps> = {},
) =>
  renderRtl(
    <TreeViewRootContext.Provider value={{ ...defaultRootContextProps, ...rootContextProps }}>
      <TreeViewItem {...defaultProps} {...props} />
    </TreeViewRootContext.Provider>,
  );

describe('TreeViewItem', () => {
  afterEach(jest.clearAllMocks);

  it('Renders a treeitem component with the given label', () => {
    render({ label });
    expect(getTreeItem({ name: label })).toBeInTheDocument();
  });

  it('Does not have focus and is not focusable by default', () => {
    render({ label });
    expect(getTreeItem({ name: label })).not.toHaveFocus();
  });

  it('Focuses the treeitem when focusedId matches nodeId', () => {
    render({ label }, { focusedId: nodeId });
    expect(getTreeItem({ name: label })).toHaveFocus();
  });

  it('Is not selected by default', () => {
    render({ label });
    expect(getTreeItem({ name: label, selected: false })).toBeInTheDocument();
  });

  it('Is selected when selectedId matches nodeId', () => {
    render({ label }, { selectedId: nodeId });
    expect(getTreeItem({ name: label, selected: true })).toBeInTheDocument();
  });

  it('Has level 1 by default', () => {
    render({ label });
    expect(getTreeItem({ name: label })).toHaveAttribute('aria-level', '1');
  });

  it('Has no `aria-expanded` attribute if it has no children', () => {
    render({ label });
    expect(getTreeItem({ name: label })).not.toHaveAttribute('aria-expanded');
  });

  it('Does not render a group component if no children are provided', () => {
    render({ label });
    expect(screen.queryByRole('group', { hidden: true })).not.toBeInTheDocument();
  });

  it('Renders a hidden group component owned by the tree item if children are provided', () => {
    render({ label, children: <TreeViewItem nodeId='child' label='Test' /> });
    const group = screen.getByRole('group', { hidden: true });
    expect(group).toBeInTheDocument();
    expect(getTreeItem({ name: label })).toHaveAttribute('aria-owns', group.id);
    expect(screen.queryByRole('group')).not.toBeInTheDocument(); // Not visible
  });

  it('Expands the tree item when it is clicked and closes it again when it is clicked again', async () => {
    render({ label, children: <TreeViewItem nodeId='child' label='Test' /> });
    expect(getTreeItem({ name: label, expanded: false })).toBeInTheDocument();
    await act(() => user.click(getTreeItem()));
    expect(getTreeItem({ name: label, expanded: true })).toBeInTheDocument();
    expect(screen.getByRole('group')).toBeInTheDocument();
    await act(() => user.click(getTreeItem()));
    expect(getTreeItem({ name: label, expanded: false })).toBeInTheDocument();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('Increases the `aria-level` attribute of its children by one', () => {
    const level2Label = 'Test';
    const level3Label = 'Subtest';
    render({
      label,
      children: (
        <TreeViewItem nodeId='child' label={level2Label}>
          <TreeViewItem nodeId='grandchild' label={level3Label} />
        </TreeViewItem>
      ),
    });
    expect(getTreeItem({ name: level2Label, hidden: true })).toHaveAttribute('aria-level', '2');
    expect(getTreeItem({ name: level3Label, hidden: true })).toHaveAttribute('aria-level', '3');
  });

  it('Calls the `setSelectedId` and `setFocusedId` callbacks with the `nodeId` when clicked', async () => {
    render({ label });
    await act(() => user.click(getTreeItem({ name: label })));
    expect(setSelectedId).toHaveBeenCalledTimes(1);
    expect(setSelectedId).toHaveBeenCalledWith(nodeId);
    expect(setFocusedId).toHaveBeenCalledTimes(1);
    expect(setFocusedId).toHaveBeenCalledWith(nodeId);
  });

  it('Calls the `setFocusedId` callback with the `nodeId` when focused', () => {
    render({ label });
    getTreeItem({ name: label }).focus();
    expect(setFocusedId).toHaveBeenCalledTimes(1);
    expect(setFocusedId).toHaveBeenCalledWith(nodeId);
  });

  it('Renders as a `li` element by default', () => {
    const { container } = render();
    expect(container.firstChild).toBe(container.querySelector('li')); // eslint-disable-line testing-library/no-node-access, testing-library/no-container
  });

  it('Supports polymorphism', () => {
    const { container } = render({ as: 'div' });
    expect(container.firstChild).toBe(container.querySelector('div')); // eslint-disable-line testing-library/no-node-access, testing-library/no-container
  });

  it('Renders with the treeitem button inside the given label wrapper', () => {
    const labelWrapperTestId = 'label-wrapper';
    render({
      label,
      labelWrapper: (children) => <div data-testid={labelWrapperTestId}>{children}</div>,
    });
    const wrapper = screen.getByTestId(labelWrapperTestId);
    expect(wrapper).toBeInTheDocument();
    expect(getTreeItem({ name: label })).toBe(wrapper.querySelector('[role="treeitem"]')); // eslint-disable-line testing-library/no-node-access
  });

  const getTreeItem = (options: ByRoleOptions = {}) => {
    const allOptions: ByRoleOptions = { name: label, ...options };
    allOptions.name = RegExp(`^${allOptions.name}( |$)`);
    return screen.getByRole('treeitem', allOptions);
  };
});
