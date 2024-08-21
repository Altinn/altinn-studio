import React from 'react';
import { fireEvent, render as renderRtl, screen } from '@testing-library/react';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

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

const render = () =>
  renderRtl(
    <DragAndDropTree.Provider onAdd={onAdd} onMove={onMove} rootId={rootId}>
      <DragAndDropTree.Root emptyMessage={emptyMessage}>
        <DragAndDropTree.Item label={rootNodeLabel1} uniqueNodeId={rootNodeId1}>
          <DragAndDropTree.Item label={subNodeLabel1_1} uniqueNodeId={subNodeId1_1}>
            <DragAndDropTree.Item label={subSubNodeLabel1_1_1} uniqueNodeId={subSubNodeId1_1_1} />
          </DragAndDropTree.Item>
          <DragAndDropTree.Item label={subNodeLabel1_2} uniqueNodeId={subNodeId1_2} />
        </DragAndDropTree.Item>
        <DragAndDropTree.Item label={rootNodeLabel2} uniqueNodeId={rootNodeId2}>
          <DragAndDropTree.Item label={subNodeLabel2_1} uniqueNodeId={subNodeId2_1} />
        </DragAndDropTree.Item>
      </DragAndDropTree.Root>
    </DragAndDropTree.Provider>,
  );

describe('DragAndDropTree', () => {
  it('Renders root items', () => {
    render();
    expect(
      screen.getByRole('treeitem', { name: rootNodeLabel1, expanded: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('treeitem', { name: rootNodeLabel2, expanded: false }),
    ).toBeInTheDocument();
  });

  it('Expands an item when clicked', async () => {
    render();
    const firstItem = screen.getByRole('treeitem', { name: rootNodeLabel1, expanded: false });
    await user.click(firstItem);
    expect(screen.getByRole('treeitem', { name: subNodeLabel1_1 })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: subNodeLabel1_2 })).toBeInTheDocument();
  });

  it('Focuses on first node when user presses the tab key', async () => {
    render();
    expect(screen.getByRole('treeitem', { name: rootNodeLabel1 })).not.toHaveFocus();
    await user.tab();
    expect(screen.getByRole('treeitem', { name: rootNodeLabel1 })).toHaveFocus();
  });

  it('Focuses on next node when user presses the down arrow key', async () => {
    render();
    const firstItem = screen.getByRole('treeitem', { name: rootNodeLabel1 });
    fireEvent.keyDown(firstItem, { key: 'ArrowDown' });

    const secondItem = screen.getByRole('treeitem', { name: rootNodeLabel2 });
    expect(secondItem).toHaveFocus();
  });

  it('Does not display empty message when there are items', () => {
    render();
    expect(screen.queryByText(emptyMessage)).not.toBeInTheDocument();
  });

  it('Displays empty message when there are no items', () => {
    renderRtl(
      <DragAndDropTree.Provider onAdd={onAdd} onMove={onMove} rootId={rootId}>
        <DragAndDropTree.Root emptyMessage={emptyMessage} />
      </DragAndDropTree.Provider>,
    );
    expect(screen.getByText(emptyMessage)).toBeInTheDocument();
  });

  it('Removes empty message when items are added', () => {
    const { rerender } = renderRtl(
      <DragAndDropTree.Provider onAdd={onAdd} onMove={onMove} rootId={rootId}>
        <DragAndDropTree.Root emptyMessage={emptyMessage} />
      </DragAndDropTree.Provider>,
    );
    rerender(
      <DragAndDropTree.Provider onAdd={onAdd} onMove={onMove} rootId={rootId}>
        <DragAndDropTree.Root emptyMessage={emptyMessage}>
          <DragAndDropTree.Item label={rootNodeLabel1} uniqueNodeId={rootNodeId1} />
        </DragAndDropTree.Root>
      </DragAndDropTree.Provider>,
    );
    expect(screen.queryByText(emptyMessage)).not.toBeInTheDocument();
  });

  it('Adds empty message when items are removed', () => {
    const { rerender } = renderRtl(
      <DragAndDropTree.Provider onAdd={onAdd} onMove={onMove} rootId={rootId}>
        <DragAndDropTree.Root emptyMessage={emptyMessage}>
          <DragAndDropTree.Item label={rootNodeLabel1} uniqueNodeId={rootNodeId1} />
        </DragAndDropTree.Root>
      </DragAndDropTree.Provider>,
    );
    rerender(
      <DragAndDropTree.Provider onAdd={onAdd} onMove={onMove} rootId={rootId}>
        <DragAndDropTree.Root emptyMessage={emptyMessage} />
      </DragAndDropTree.Provider>,
    );
    expect(screen.getByText(emptyMessage)).toBeInTheDocument();
  });
});
