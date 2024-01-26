import React from 'react';
import { renderHook } from '@testing-library/react';
import { useOnDrop } from './useOnDrop';
import type {
  ExistingDndItem,
  HandleAdd,
  HandleMove,
  ItemPosition,
  NewDndItem,
} from 'app-shared/types/dndTypes';
import { DragAndDrop } from '../';

// Test data:
const onAdd: HandleAdd<string> = jest.fn();
const onMove: HandleMove = jest.fn();
const position: ItemPosition = { parentId: 'parentId', index: 0 };

describe('useOnDrop', () => {
  afterEach(jest.clearAllMocks);

  it('Returns a function that in turn calls the onAdd function with correct parameters when called with a new item', () => {
    const { result } = renderHook(() => useOnDrop<string>(), {
      wrapper: ({ children }) => (
        <DragAndDrop.Provider rootId='root' onAdd={onAdd} onMove={jest.fn()}>
          {children}
        </DragAndDrop.Provider>
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
        <DragAndDrop.Provider rootId='root' onAdd={onAdd} onMove={onMove}>
          {children}
        </DragAndDrop.Provider>
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
    jest.spyOn(console, 'error').mockImplementation();
    const renderFn = () => renderHook(useOnDrop<string>);
    expect(renderFn).toThrow(
      new Error('useOnDrop must be used within a DragAndDropRootContext provider.'),
    );
  });
});
