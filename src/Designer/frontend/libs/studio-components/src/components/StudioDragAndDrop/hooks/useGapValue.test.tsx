import { renderHook } from '@testing-library/react';
import { useGapValue } from './useGapValue';
import React from 'react';
import { StudioDragAndDrop } from '../';

describe('useGapValue', () => {
  it('Returns the gap value from the context', () => {
    const gap = '1rem';
    const { result } = renderHook(useGapValue, {
      wrapper: ({ children }) => (
        <StudioDragAndDrop.Provider rootId='root' onAdd={jest.fn()} onMove={jest.fn()} gap={gap}>
          {children}
        </StudioDragAndDrop.Provider>
      ),
    });
    expect(result.current).toBe(gap);
  });

  it('Returns an error when it is called outside of a provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(useGapValue)).toThrow(
      'useGapValue must be used within a DragAndDropProvider',
    );
  });
});
