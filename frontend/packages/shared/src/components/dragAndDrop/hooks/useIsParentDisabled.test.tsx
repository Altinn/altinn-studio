import React from 'react';
import { useIsParentDisabled } from './useIsParentDisabled';
import { renderHook } from '@testing-library/react';
import { DragAndDrop } from '../';

// Mocks:
const draggedItemId = 'draggedItemId';
jest.mock('react-dnd', () => ({
  ...jest.requireActual('react-dnd'),
  useDrag: (args) => [{ isDragging: args.item().id === draggedItemId }, jest.fn(), jest.fn()],
}));
jest.mock('../utils/domUtils', () => ({
  ...jest.requireActual('../utils/domUtils'),
  findPositionInList: jest.fn().mockReturnValue(0),
}));

describe('useIsParentDisabled', () => {
  it('Returns false when it is called from directly within the drag an drop provider', () => {
    const { result } = renderHook(useIsParentDisabled, {
      wrapper: ({ children }) => (
        <DragAndDrop.Provider rootId='root' onAdd={jest.fn()} onMove={jest.fn()}>
          {children}
        </DragAndDrop.Provider>
      ),
    });
    expect(result.current).toBe(false);
  });

  it('Returns false when it is called from directly within the root droppable list', () => {
    const { result } = renderHook(useIsParentDisabled, {
      wrapper: ({ children }) => (
        <DragAndDrop.Provider rootId='root' onAdd={jest.fn()} onMove={jest.fn()}>
          <DragAndDrop.List>{children}</DragAndDrop.List>
        </DragAndDrop.Provider>
      ),
    });
    expect(result.current).toBe(false);
  });

  it('Returns true when it is called from an item that is being dragged', () => {
    const { result } = renderHook(useIsParentDisabled, {
      wrapper: ({ children }) => (
        <DragAndDrop.Provider rootId='root' onAdd={jest.fn()} onMove={jest.fn()}>
          <DragAndDrop.List>
            <DragAndDrop.ListItem itemId={draggedItemId} renderItem={() => children} />
          </DragAndDrop.List>
        </DragAndDrop.Provider>
      ),
    });
    expect(result.current).toBe(true);
  });

  it('Returns true when it is called from a child item of an item that is being dragged', () => {
    const { result } = renderHook(useIsParentDisabled, {
      wrapper: ({ children }) => (
        <DragAndDrop.Provider rootId='root' onAdd={jest.fn()} onMove={jest.fn()}>
          <DragAndDrop.List>
            <DragAndDrop.ListItem
              itemId={draggedItemId}
              renderItem={() => (
                <DragAndDrop.List>
                  <DragAndDrop.ListItem itemId='subitem' renderItem={() => children} />
                </DragAndDrop.List>
              )}
            />
          </DragAndDrop.List>
        </DragAndDrop.Provider>
      ),
    });
    expect(result.current).toBe(true);
  });

  it('Returns false when it is called from an item that is not being dragged', () => {
    const { result } = renderHook(useIsParentDisabled, {
      wrapper: ({ children }) => (
        <DragAndDrop.Provider rootId='root' onAdd={jest.fn()} onMove={jest.fn()}>
          <DragAndDrop.List>
            <DragAndDrop.ListItem itemId='item' renderItem={() => children} />
          </DragAndDrop.List>
        </DragAndDrop.Provider>
      ),
    });
    expect(result.current).toBe(false);
  });
});
