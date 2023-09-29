import { renderHook } from '@testing-library/react';
import { useGapValue } from './useGapValue';
import React from 'react';
import { DragAndDrop } from 'app-shared/components/dragAndDrop';

describe('useGapValue', () => {
  it('Returns the gap value from the context', () => {
    const gap = '1rem';
    const { result } = renderHook(useGapValue, {
      wrapper: ({ children }) => (
        <DragAndDrop.Provider rootId='root' onAdd={jest.fn()} onMove={jest.fn()} gap={gap}>
          {children}
        </DragAndDrop.Provider>
      ),
    });
    expect(result.current).toBe(gap);
  });

  it('Returns an error when it is called outside of a provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(useGapValue)).toThrowError(
      'useGapValue must be used within a DragAndDropProvider',
    );
  });
});
