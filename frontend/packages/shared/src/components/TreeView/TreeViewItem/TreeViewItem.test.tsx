import React from 'react';
import type { TreeViewItemProps } from './TreeViewItem';
import { act, ByRoleOptions, render as renderRtl, screen } from '@testing-library/react';
import { TreeViewItem } from './TreeViewItem';
import { TreeViewRootContext, TreeViewRootContextProps } from '../TreeViewRoot';
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
  rootContextProps: Partial<TreeViewRootContextProps> = {}
) =>
  renderRtl(
    <TreeViewRootContext.Provider value={{ ...defaultRootContextProps, ...rootContextProps }}>
      <TreeViewItem {...defaultProps} {...props} />
    </TreeViewRootContext.Provider>
  );

describe('TreeViewItem', () => {
  afterEach(jest.clearAllMocks);

  it('Renders a treeitem component with the given label', () => {
    render();
    expect(getTreeitem()).toBeInTheDocument();
  });

  it('Does not have focus and is not focusable by default', () => {
    render();
    expect(getTreeitem()).not.toHaveFocus();
  });

  it('Focuses the treeitem when focusedId matches nodeId', () => {
    render({}, { focusedId: nodeId });
    expect(getTreeitem()).toHaveFocus();
  });

  it('Is not selected by default', () => {
    render();
    expect(getTreeitem({ selected: false })).toBeInTheDocument();
  });

  it('Is selected when selectedId matches nodeId', () => {
    render({}, { selectedId: nodeId });
    expect(getTreeitem({ selected: true })).toBeInTheDocument();
  });

  it('Has level 1 by default', () => {
    render();
    expect(getTreeitem()).toHaveAttribute('aria-level', '1');
  });

  it('Has no `aria-expanded` attribute if it has no children', () => {
    render();
    expect(getTreeitem()).not.toHaveAttribute('aria-expanded');
  });

  it('Does not render a group component if no children are provided', () => {
    render();
    expect(screen.queryByRole('group', { hidden: true })).not.toBeInTheDocument();
  });

  it('Renders a hidden group component owned by the tree item if children are provided', () => {
    render({ children: <TreeViewItem nodeId='child' label='Test' /> });
    const group = screen.getByRole('group', { hidden: true });
    expect(group).toBeInTheDocument();
    expect(getTreeitem()).toHaveAttribute('aria-owns', group.id);
    expect(screen.queryByRole('group')).not.toBeInTheDocument(); // Not visible
  });

  it('Expands the tree item when it is clicked and closes it again when it is clicked again', async () => {
    render({ children: <TreeViewItem nodeId='child' label='Test' /> });
    expect(getTreeitem({ expanded: false })).toBeInTheDocument();
    await act(() => user.click(getTreeitem()));
    expect(getTreeitem({ expanded: true })).toBeInTheDocument();
    expect(screen.getByRole('group')).toBeInTheDocument();
    await act(() => user.click(getTreeitem()));
    expect(getTreeitem({ expanded: false })).toBeInTheDocument();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('Increases the `aria-level` attribute of its children by one', () => {
    const level2Label = 'Test';
    const level3Label = 'Subtest';
    render({
      children: (
        <TreeViewItem nodeId='child' label={level2Label}>
          <TreeViewItem nodeId='grandchild' label={level3Label} />
        </TreeViewItem>
      ),
    });
    expect(getTreeitem({ name: 'Test', hidden: true })).toHaveAttribute('aria-level', '2');
    expect(getTreeitem({ name: 'Subtest', hidden: true })).toHaveAttribute('aria-level', '3');
  });

  it('Calls the `setSelectedId` and `setFocusedId` callbacks with the `nodeId` when clicked', async () => {
    render();
    await act(() => user.click(getTreeitem()));
    expect(setSelectedId).toHaveBeenCalledTimes(1);
    expect(setSelectedId).toHaveBeenCalledWith(nodeId);
    expect(setFocusedId).toHaveBeenCalledTimes(1);
    expect(setFocusedId).toHaveBeenCalledWith(nodeId);
  });

  it('Calls the `setFocusedId` callback with the `nodeId` when focused', () => {
    render();
    getTreeitem().focus();
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
    render({ labelWrapper: (children) => <div data-testid={labelWrapperTestId}>{children}</div> });
    const wrapper = screen.getByTestId(labelWrapperTestId);
    expect(wrapper).toBeInTheDocument();
    expect(getTreeitem()).toBe(wrapper.querySelector('[role="treeitem"]')); // eslint-disable-line testing-library/no-node-access
  });

  const getTreeitem = (options: ByRoleOptions = {}) => {
    const allOptions: ByRoleOptions = { name: label, ...options };
    allOptions.name = RegExp(`^${allOptions.name}( |$)`);
    return screen.getByRole('treeitem', allOptions);
  };
});
