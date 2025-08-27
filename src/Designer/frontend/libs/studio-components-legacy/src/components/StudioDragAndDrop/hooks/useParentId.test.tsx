import React from 'react';
import { renderHook } from '@testing-library/react';
import { useParentId } from './useParentId';
import { StudioDragAndDrop } from '../';

describe('useParentId', () => {
  it('Returns the id of the parent component', () => {
    const parentId = 'parentId';
    const { result } = renderHook(() => useParentId(), {
      wrapper: ({ children }) => (
        <StudioDragAndDrop.Provider rootId='root' onAdd={jest.fn()} onMove={jest.fn()}>
          <StudioDragAndDrop.List>
            <StudioDragAndDrop.ListItem itemId={parentId} renderItem={() => children} />
          </StudioDragAndDrop.List>
        </StudioDragAndDrop.Provider>
      ),
    });
    expect(result.current).toBe(parentId);
  });

  it('Returns the root id if there is no DragAndDropListItem parent component', () => {
    const rootId = 'rootId';
    const { result } = renderHook(() => useParentId(), {
      wrapper: ({ children }) => (
        <StudioDragAndDrop.Provider rootId={rootId} onAdd={jest.fn()} onMove={jest.fn()}>
          {children}
        </StudioDragAndDrop.Provider>
      ),
    });
    expect(result.current).toBe(rootId);
  });

  it('Throws an error if not wrapped by a DragAndDropProvider', () => {
    jest.spyOn(console, 'error').mockImplementation();
    const renderFn = () =>
      renderHook(() => useParentId(), {
        wrapper: ({ children }) => <div>{children}</div>,
      });
    expect(renderFn).toThrow(new Error('useParentId must be used within a DragAndDropProvider.'));
  });
});
