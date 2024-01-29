import React from 'react';
import { renderHook } from '@testing-library/react';
import { useTreeViewItemContext } from './useTreeViewItemContext';
import { StudioTreeViewItemContext } from '../StudioTreeViewItem';

describe('useTreeViewItemContext', () => {
  it('Accesses the TreeViewItemContext from the provider', () => {
    const level = 3;
    const { result } = renderHook(useTreeViewItemContext, {
      wrapper: ({ children }) => (
        <StudioTreeViewItemContext.Provider value={{ level }}>
          {children}
        </StudioTreeViewItemContext.Provider>
      ),
    });
    expect(result.current.level).toBe(level);
  });

  it('Returns { level: 1 } when not wrapped in a TreeViewItemContext provider', () => {
    const { result } = renderHook(useTreeViewItemContext);
    expect(result.current.level).toBe(1);
  });
});
