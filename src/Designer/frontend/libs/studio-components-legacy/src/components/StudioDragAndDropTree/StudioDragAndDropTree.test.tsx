import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { StudioDragAndDropTree } from './index';
import userEvent from '@testing-library/user-event';

// Test data:
const onAdd = jest.fn();
const onMove = jest.fn();
const rootId = 'rootId';
const emptyMessage = 'No items';
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

const renderDragAndDropTree = () =>
  render(
    <StudioDragAndDropTree.Provider onAdd={onAdd} onMove={onMove} rootId={rootId}>
      <StudioDragAndDropTree.Root emptyMessage={emptyMessage}>
        <StudioDragAndDropTree.Item label={rootNodeLabel1} nodeId={rootNodeId1}>
          <StudioDragAndDropTree.Item label={subNodeLabel1_1} nodeId={subNodeId1_1}>
            <StudioDragAndDropTree.Item label={subSubNodeLabel1_1_1} nodeId={subSubNodeId1_1_1} />
          </StudioDragAndDropTree.Item>
          <StudioDragAndDropTree.Item label={subNodeLabel1_2} nodeId={subNodeId1_2} />
        </StudioDragAndDropTree.Item>
        <StudioDragAndDropTree.Item label={rootNodeLabel2} nodeId={rootNodeId2}>
          <StudioDragAndDropTree.Item label={subNodeLabel2_1} nodeId={subNodeId2_1} />
        </StudioDragAndDropTree.Item>
      </StudioDragAndDropTree.Root>
    </StudioDragAndDropTree.Provider>,
  );

describe('StudioDragAndDropTree', () => {
  it('Renders root items', () => {
    renderDragAndDropTree();
    expect(
      screen.getByRole('treeitem', { name: rootNodeLabel1, expanded: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('treeitem', { name: rootNodeLabel2, expanded: false }),
    ).toBeInTheDocument();
  });

  it('Expands an item when clicked', async () => {
    const user = userEvent.setup();
    renderDragAndDropTree();
    const firstItem = screen.getByRole('treeitem', { name: rootNodeLabel1, expanded: false });
    await user.click(firstItem);
    expect(screen.getByRole('treeitem', { name: subNodeLabel1_1 })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: subNodeLabel1_2 })).toBeInTheDocument();
  });

  it('Focuses on first node when user presses the tab key', async () => {
    const user = userEvent.setup();
    renderDragAndDropTree();
    expect(screen.getByRole('treeitem', { name: rootNodeLabel1 })).not.toHaveFocus();
    await user.tab();
    expect(screen.getByRole('treeitem', { name: rootNodeLabel1 })).toHaveFocus();
  });

  it('Focuses on next node when user presses the down arrow key', async () => {
    renderDragAndDropTree();
    const firstItem = screen.getByRole('treeitem', { name: rootNodeLabel1 });
    fireEvent.keyDown(firstItem, { key: 'ArrowDown' });

    const secondItem = screen.getByRole('treeitem', { name: rootNodeLabel2 });
    expect(secondItem).toHaveFocus();
  });

  it('Does not display empty message when there are items', () => {
    renderDragAndDropTree();
    expect(screen.queryByText(emptyMessage)).not.toBeInTheDocument();
  });

  it('Displays empty message when there are no items', () => {
    render(
      <StudioDragAndDropTree.Provider onAdd={onAdd} onMove={onMove} rootId={rootId}>
        <StudioDragAndDropTree.Root emptyMessage={emptyMessage} />
      </StudioDragAndDropTree.Provider>,
    );
    expect(screen.getByText(emptyMessage)).toBeInTheDocument();
  });

  it('Removes empty message when items are added', () => {
    const { rerender } = render(
      <StudioDragAndDropTree.Provider onAdd={onAdd} onMove={onMove} rootId={rootId}>
        <StudioDragAndDropTree.Root emptyMessage={emptyMessage} />
      </StudioDragAndDropTree.Provider>,
    );
    rerender(
      <StudioDragAndDropTree.Provider onAdd={onAdd} onMove={onMove} rootId={rootId}>
        <StudioDragAndDropTree.Root emptyMessage={emptyMessage}>
          <StudioDragAndDropTree.Item label={rootNodeLabel1} nodeId={rootNodeId1} />
        </StudioDragAndDropTree.Root>
      </StudioDragAndDropTree.Provider>,
    );
    expect(screen.queryByText(emptyMessage)).not.toBeInTheDocument();
  });

  it('Adds empty message when items are removed', () => {
    const { rerender } = render(
      <StudioDragAndDropTree.Provider onAdd={onAdd} onMove={onMove} rootId={rootId}>
        <StudioDragAndDropTree.Root emptyMessage={emptyMessage}>
          <StudioDragAndDropTree.Item label={rootNodeLabel1} nodeId={rootNodeId1} />
        </StudioDragAndDropTree.Root>
      </StudioDragAndDropTree.Provider>,
    );
    rerender(
      <StudioDragAndDropTree.Provider onAdd={onAdd} onMove={onMove} rootId={rootId}>
        <StudioDragAndDropTree.Root emptyMessage={emptyMessage} />
      </StudioDragAndDropTree.Provider>,
    );
    expect(screen.getByText(emptyMessage)).toBeInTheDocument();
  });
});
