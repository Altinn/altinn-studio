import React from 'react';
import { useIsParentDisabled } from './useIsParentDisabled';
import { renderHook } from '@testing-library/react';
import { StudioDragAndDrop } from '../';
import { type useDrag } from 'react-dnd';

// Mocks:
const draggedItemId = 'draggedItemId';
jest.mock('react-dnd', () => ({
  ...jest.requireActual('react-dnd'),
  useDrag: (args: Parameters<typeof useDrag>[0]): ReturnType<typeof useDrag> => {
    const spec = typeof args === 'function' ? args() : args;
    const item = typeof spec.item === 'function' ? spec.item() : spec.item;
    return [{ isDragging: item.id === draggedItemId }, jest.fn(), jest.fn()];
  },
}));
jest.mock('../utils/domUtils', () => ({
  ...jest.requireActual('../utils/domUtils'),
  findPositionInList: jest.fn().mockReturnValue(0),
}));

describe('useIsParentDisabled', () => {
  it('Returns false when it is called from directly within the drag an drop provider', () => {
    const { result } = renderHook(useIsParentDisabled, {
      wrapper: ({ children }) => (
        <StudioDragAndDrop.Provider rootId='root' onAdd={jest.fn()} onMove={jest.fn()}>
          {children}
        </StudioDragAndDrop.Provider>
      ),
    });
    expect(result.current).toBe(false);
  });

  it('Returns false when it is called from directly within the root droppable list', () => {
    const { result } = renderHook(useIsParentDisabled, {
      wrapper: ({ children }) => (
        <StudioDragAndDrop.Provider rootId='root' onAdd={jest.fn()} onMove={jest.fn()}>
          <StudioDragAndDrop.List>{children}</StudioDragAndDrop.List>
        </StudioDragAndDrop.Provider>
      ),
    });
    expect(result.current).toBe(false);
  });

  it('Returns true when it is called from an item that is being dragged', () => {
    const { result } = renderHook(useIsParentDisabled, {
      wrapper: ({ children }) => (
        <StudioDragAndDrop.Provider rootId='root' onAdd={jest.fn()} onMove={jest.fn()}>
          <StudioDragAndDrop.List>
            <StudioDragAndDrop.ListItem itemId={draggedItemId} renderItem={() => children} />
          </StudioDragAndDrop.List>
        </StudioDragAndDrop.Provider>
      ),
    });
    expect(result.current).toBe(true);
  });

  it('Returns true when it is called from a child item of an item that is being dragged', () => {
    const { result } = renderHook(useIsParentDisabled, {
      wrapper: ({ children }) => (
        <StudioDragAndDrop.Provider rootId='root' onAdd={jest.fn()} onMove={jest.fn()}>
          <StudioDragAndDrop.List>
            <StudioDragAndDrop.ListItem
              itemId={draggedItemId}
              renderItem={() => (
                <StudioDragAndDrop.List>
                  <StudioDragAndDrop.ListItem itemId='subitem' renderItem={() => children} />
                </StudioDragAndDrop.List>
              )}
            />
          </StudioDragAndDrop.List>
        </StudioDragAndDrop.Provider>
      ),
    });
    expect(result.current).toBe(true);
  });

  it('Returns false when it is called from an item that is not being dragged', () => {
    const { result } = renderHook(useIsParentDisabled, {
      wrapper: ({ children }) => (
        <StudioDragAndDrop.Provider rootId='root' onAdd={jest.fn()} onMove={jest.fn()}>
          <StudioDragAndDrop.List>
            <StudioDragAndDrop.ListItem itemId='item' renderItem={() => children} />
          </StudioDragAndDrop.List>
        </StudioDragAndDrop.Provider>
      ),
    });
    expect(result.current).toBe(false);
  });
});
