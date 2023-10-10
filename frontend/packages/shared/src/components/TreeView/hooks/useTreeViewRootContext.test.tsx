import React from 'react';
import { renderHook } from '@testing-library/react';
import { useTreeViewRootContext } from './useTreeViewRootContext';
import { TreeViewRootContext } from '../TreeViewRoot';
import type { TreeViewRootContextProps } from '../TreeViewRoot';

describe('useTreeViewRootContext', () => {
  it('Accesses the TreeViewRootContext from the provider', () => {
    const focusableId = 'foobar';
    const focusedId = 'foo';
    const rootId = 'baz';
    const selectedId = 'bar';
    const setFocusedId = jest.fn();
    const setSelectedId = jest.fn();
    const props: TreeViewRootContextProps = {
      focusableId,
      focusedId,
      rootId,
      selectedId,
      setFocusedId,
      setSelectedId,
    };
    const { result } = renderHook(useTreeViewRootContext, {
      wrapper: ({ children }) => (
        <TreeViewRootContext.Provider value={props}>{children}</TreeViewRootContext.Provider>
      ),
    });
    expect(result.current).toBe(props);
    expect(result.current).toEqual(props);
  });

  it('Throws an error if used outside of a TreeViewRootContext provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const renderFn = () => renderHook(useTreeViewRootContext);
    expect(renderFn).toThrowError(
      'useTreeViewRootContext must be used within the TreeViewRoot component.'
    );
  });
});
