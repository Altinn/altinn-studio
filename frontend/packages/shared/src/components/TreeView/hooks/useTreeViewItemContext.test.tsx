import React from 'react';
import { renderHook } from '@testing-library/react';
import { useTreeViewItemContext } from './useTreeViewItemContext';
import { TreeViewItemContext } from '../TreeViewItem';

describe('useTreeViewItemContext', () => {
  it('Accesses the TreeViewItemContext from the provider', () => {
    const level = 3;
    const { result } = renderHook(useTreeViewItemContext, {
      wrapper: ({ children }) => (
        <TreeViewItemContext.Provider value={{ level }}>{children}</TreeViewItemContext.Provider>
      ),
    });
    expect(result.current.level).toBe(level);
  });

  it('Returns { level: 1 } when not wrapped in a TreeViewItemContext provider', () => {
    const { result } = renderHook(useTreeViewItemContext);
    expect(result.current.level).toBe(1);
  });
});
