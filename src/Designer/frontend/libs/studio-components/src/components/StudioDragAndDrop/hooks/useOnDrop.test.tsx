import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOnDrop } from './useOnDrop';
import type { ExistingDndItem, HandleAdd, HandleMove, ItemPosition, NewDndItem } from '../types';
import { StudioDragAndDrop } from '../';

// Test data:
const onAdd: HandleAdd<string> = vi.fn();
const onMove: HandleMove = vi.fn();
const position: ItemPosition = { parentId: 'parentId', index: 0 };

describe('useOnDrop', () => {
  afterEach(vi.clearAllMocks);

  it('Returns a function that in turn calls the onAdd function with correct parameters when called with a new item', () => {
    const { result } = renderHook(() => useOnDrop<string>(), {
      wrapper: ({ children }) => (
        <StudioDragAndDrop.Provider rootId='root' onAdd={onAdd} onMove={vi.fn()}>
          {children}
        </StudioDragAndDrop.Provider>
      ),
    });
    const onDrop = result.current;
    const payload = 'payload';
    const item: NewDndItem<string> = { isNew: true, payload };
    onDrop(item, position);
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(payload, position);
    expect(onMove).not.toHaveBeenCalled();
  });

  it('Returns a function that in turn calls the onMove function with correct parameters when called with an existing item', () => {
    const { result } = renderHook(() => useOnDrop<string>(), {
      wrapper: ({ children }) => (
        <StudioDragAndDrop.Provider rootId='root' onAdd={onAdd} onMove={onMove}>
          {children}
        </StudioDragAndDrop.Provider>
      ),
    });
    const onDrop = result.current;
    const id = 'id';
    const item: ExistingDndItem = { isNew: false, id, position };
    onDrop(item, position);
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith(id, position);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('Throws an error if not wrapped by a DragAndDropProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const renderFn = (): ReturnType<typeof renderHook> => renderHook(useOnDrop<string>);
    expect(renderFn).toThrow(
      new Error('useOnDrop must be used within a DragAndDropRootContext provider.'),
    );
  });
});
