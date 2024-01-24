import React from 'react';
import type { TreeViewRootProps } from './';
import { TreeView } from './';
import type { ByRoleOptions } from '@testing-library/react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

// Test data:
const rootNodeId1 = '1';
const rootNodeLabel1 = 'Test 1';
const subNodeId1_1 = '1.1';
const subNodeLabel1_1 = 'Test 1.1';
const subNodeId1_2 = '1.2';
const subNodeLabel1_2 = 'Test 1.2';
const subSubNodeId1_1_1 = '1.1.1';
const subSubNodeLabel1_1_1 = 'Test 1.1.1';
const rootNodeId2 = '2';
const rootNodeLabel2 = 'Test 2';
const subNodeId2_1 = '2.1';
const subNodeLabel2_1 = 'Test 2.1';

type TestComponentProps = Omit<TreeViewRootProps, 'children'>;

const onSelect = jest.fn();
const defaultProps: TestComponentProps = { onSelect };

const simpleComposition = (testProps: Partial<TestComponentProps> = {}) => (
  <TreeView.Root {...defaultProps} {...testProps}>
    <TreeView.Item nodeId={rootNodeId1} label={rootNodeLabel1}>
      <TreeView.Item nodeId={subNodeId1_1} label={subNodeLabel1_1} />
      <TreeView.Item nodeId={subNodeId1_2} label={subNodeLabel1_2}>
        <TreeView.Item nodeId={subSubNodeId1_1_1} label={subSubNodeLabel1_1_1} />
      </TreeView.Item>
    </TreeView.Item>
    <TreeView.Item nodeId={rootNodeId2} label={rootNodeLabel2}>
      <TreeView.Item nodeId={subNodeId2_1} label={subNodeLabel2_1} />
    </TreeView.Item>
  </TreeView.Root>
);

const complexComposition = (testProps: Partial<TestComponentProps> = {}) => (
  <TreeView.Root {...defaultProps} {...testProps}>
    <TreeView.Item nodeId={rootNodeId1} label={rootNodeLabel1}>
      <li>
        <TreeView.Item as='div' nodeId={subNodeId1_1} label={subNodeLabel1_1} />
      </li>
      <li>Something in between</li>
      <li>
        <TreeView.Item
          as='div'
          nodeId={subNodeId1_2}
          label={subNodeLabel1_2}
          labelWrapper={(children) => (
            <div>
              {children}
              <span>Something</span>
            </div>
          )}
        >
          <TreeView.Item nodeId={subSubNodeId1_1_1} label={subSubNodeLabel1_1_1} />
        </TreeView.Item>
      </li>
    </TreeView.Item>
    <TreeView.Item nodeId={rootNodeId2} label={rootNodeLabel2}>
      <div>Something</div>
      <TreeView.Item nodeId={subNodeId2_1} label={subNodeLabel2_1} />
      <div>Something</div>
    </TreeView.Item>
  </TreeView.Root>
);

type SimpleOrComplex = 'simple' | 'complex';

const createRenderFunction =
  (simpleOrComplex: SimpleOrComplex) =>
  (props: Partial<TestComponentProps> = {}) => {
    const testComponent = simpleOrComplex === 'simple' ? simpleComposition : complexComposition;
    const { rerender, ...renderResult } = render(testComponent(props));
    const rerenderTestComponent = (newProps: Partial<TestComponentProps>) =>
      rerender(testComponent(newProps));
    return { ...renderResult, rerender: rerenderTestComponent };
  };

describe('TreeView', () => {
  afterEach(jest.clearAllMocks);

  describe.each(['simple', 'complex'])('%s composition', (simpleOrComplex: SimpleOrComplex) => {
    const renderTreeView = createRenderFunction(simpleOrComplex); // eslint-disable-line testing-library/render-result-naming-convention

    it('Renders a tree component', () => {
      renderTreeView();
      expect(screen.getByRole('tree')).toBeInTheDocument();
    });

    it('Displays the root nodes', () => {
      renderTreeView();
      expect(getTreeitem({ label: rootNodeLabel1 })).toBeInTheDocument();
      expect(getTreeitem({ label: rootNodeLabel2 })).toBeInTheDocument();
    });

    it('Does not display the child nodes by default', () => {
      renderTreeView();
      expect(getTreeitem({ label: rootNodeLabel1, expanded: false })).toBeInTheDocument();
      expect(queryTreeitem({ label: subNodeLabel1_1 })).not.toBeInTheDocument();
      expect(queryTreeitem({ label: subNodeLabel1_2 })).not.toBeInTheDocument();
      expect(getTreeitem({ label: rootNodeLabel2, expanded: false })).toBeInTheDocument();
      expect(queryTreeitem({ label: subNodeLabel2_1 })).not.toBeInTheDocument();
    });

    it('Displays child nodes when clicked', async () => {
      renderTreeView();
      await act(() => user.click(getTreeitem({ label: rootNodeLabel2, expanded: false })));
      expect(getTreeitem({ label: rootNodeLabel1, expanded: false })).toBeInTheDocument();
      expect(getTreeitem({ label: rootNodeLabel2, expanded: true })).toBeInTheDocument();
      expect(getTreeitem({ label: subNodeLabel2_1 })).toBeInTheDocument();
    });

    it('Has no selected node by default', () => {
      renderTreeView();
      expect(queryTreeitem({ selected: true })).not.toBeInTheDocument();
    });

    it('Selects the node given by the `selectedId` prop', () => {
      renderTreeView({ selectedId: rootNodeId2 });
      expect(getTreeitem({ selected: true })).toBe(getTreeitem({ label: rootNodeLabel2 }));
    });

    it('Rerenders with new selected node when the `selectedId` prop changes', () => {
      const { rerender } = renderTreeView({ selectedId: rootNodeId2 });
      rerender({ selectedId: rootNodeId1 });
      expect(getTreeitem({ selected: true })).toBe(getTreeitem({ label: rootNodeLabel1 }));
    });

    it('Selects a node and calls the `onSelect` callback with the id when clicked', async () => {
      renderTreeView();
      await act(() => user.click(getTreeitem({ label: rootNodeLabel2 })));
      expect(getTreeitem({ label: rootNodeLabel2, selected: true })).toBeInTheDocument();
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(rootNodeId2);
    });

    it('Focuses on first node when the user presses the tab key and nothing is selected', async () => {
      renderTreeView();
      await act(() => user.tab());
      expect(getTreeitem({ label: rootNodeLabel1 })).toHaveFocus();
    });

    it('Focuses on the selected node when the user presses the tab key', async () => {
      renderTreeView({ selectedId: rootNodeId2 });
      await act(() => user.tab());
      expect(getTreeitem({ label: rootNodeLabel2 })).toHaveFocus();
    });

    test('Arrow key interactions', async () => {
      renderTreeView();
      await act(() => user.tab()); // Focuses on first node
      expect(getTreeitem({ label: rootNodeLabel1, expanded: false })).toHaveFocus();
      await act(() => user.keyboard('{arrowup}')); // Should do nothing because the focused node is the first one
      expect(getTreeitem({ label: rootNodeLabel1, expanded: false })).toHaveFocus();
      await act(() => user.keyboard('{arrowright}')); // Should open the node
      expect(getTreeitem({ label: rootNodeLabel1, expanded: true })).toHaveFocus();
      await act(() => user.keyboard('{arrowright}')); // Should focus on first child
      expect(getTreeitem({ label: subNodeLabel1_1 })).toHaveFocus();
      await act(() => user.keyboard('{arrowdown}')); // Should focus on next child
      expect(getTreeitem({ label: subNodeLabel1_2, expanded: false })).toHaveFocus();
      await act(() => user.keyboard('{arrowdown}')); // Should focus on next visible node
      expect(getTreeitem({ label: rootNodeLabel2, expanded: false })).toHaveFocus();
      await act(() => user.keyboard('{arrowdown}')); // Should not do anything because there are no more visible nodes
      expect(getTreeitem({ label: rootNodeLabel2, expanded: false })).toHaveFocus();
      await act(() => user.keyboard('{arrowup}')); // Should focus on previous visible node
      expect(getTreeitem({ label: subNodeLabel1_2, expanded: false })).toHaveFocus();
      await act(() => user.keyboard('{arrowleft}')); // Should focus on parent node
      expect(getTreeitem({ label: rootNodeLabel1, expanded: true })).toHaveFocus();
      await act(() => user.keyboard('{arrowleft}')); // Should close the node
      expect(getTreeitem({ label: rootNodeLabel1, expanded: false })).toHaveFocus();
      await act(() => user.keyboard('{arrowleft}')); // Should do nothing because the focused node is already closed and has no parent
      expect(getTreeitem({ label: rootNodeLabel1, expanded: false })).toHaveFocus();
    });

    test('Home and End key interactions', async () => {
      renderTreeView();
      await act(() => user.tab()); // Focuses on first node
      expect(getTreeitem({ label: rootNodeLabel1, expanded: false })).toHaveFocus();
      await act(() => user.keyboard('{end}')); // Should focus on last visible node
      expect(getTreeitem({ label: rootNodeLabel2, expanded: false })).toHaveFocus();
      await act(() => user.keyboard('{home}')); // Should focus on first visible node
      expect(getTreeitem({ label: rootNodeLabel1, expanded: false })).toHaveFocus();
      await act(() => user.click(getTreeitem({ label: rootNodeLabel2 }))); // Expands the node
      await act(() => user.keyboard('{end}')); // Should focus on last visible node, which is now within the expanded node
      expect(getTreeitem({ label: subNodeLabel2_1 })).toHaveFocus();
    });

    test('Enter key interaction', async () => {
      renderTreeView();
      await act(() => user.tab());
      expect(getTreeitem({ label: rootNodeLabel1, expanded: false })).toHaveFocus();
      await act(() => user.keyboard('{enter}')); // Should select the node
      expect(getTreeitem({ label: rootNodeLabel1, selected: true })).toHaveFocus();
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(rootNodeId1);
    });
  });

  const getTreeitem = ({ label, ...options }: ByRoleOptions & { label?: string } = {}) => {
    if (label) options.name = RegExp(`^${label}( |$)`);
    return screen.getByRole('treeitem', options);
  };
  const queryTreeitem = ({ label, ...options }: ByRoleOptions & { label?: string } = {}) => {
    if (label) options.name = RegExp(`^${label}( |$)`);
    return screen.queryByRole('treeitem', options);
  };
});
