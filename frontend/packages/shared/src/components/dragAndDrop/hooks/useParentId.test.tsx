import React from 'react';
import { renderHook } from '@testing-library/react';
import { useParentId } from './useParentId';
import { DragAndDrop } from 'app-shared/components/dragAndDrop';

describe('useParentId', () => {
  it('Returns the id of the parent component', () => {
    const parentId = 'parentId';
    const { result } = renderHook(() => useParentId(), {
      wrapper: ({ children }) => (
        <DragAndDrop.Provider rootId='root' onAdd={jest.fn()} onMove={jest.fn()}>
          <DragAndDrop.List>
            <DragAndDrop.ListItem index={0} itemId={parentId} renderItem={() => children} />
          </DragAndDrop.List>
        </DragAndDrop.Provider>
      ),
    });
    expect(result.current).toBe(parentId);
  });

  it('Returns the root id if there is no DragAndDropListItem parent component', () => {
    const rootId = 'rootId';
    const { result } = renderHook(() => useParentId(), {
      wrapper: ({ children }) => (
        <DragAndDrop.Provider rootId={rootId} onAdd={jest.fn()} onMove={jest.fn()}>
          {children}
        </DragAndDrop.Provider>
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
