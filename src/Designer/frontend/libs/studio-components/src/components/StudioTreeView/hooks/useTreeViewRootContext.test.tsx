import React from 'react';
import { renderHook } from '@testing-library/react';
import { useTreeViewRootContext } from './useTreeViewRootContext';
import { StudioTreeViewRootContext } from '../StudioTreeViewRoot';
import type { TreeViewRootContextProps } from '../StudioTreeViewRoot';

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
        <StudioTreeViewRootContext.Provider value={props}>
          {children}
        </StudioTreeViewRootContext.Provider>
      ),
    });
    expect(result.current).toBe(props);
    expect(result.current).toEqual(props);
  });

  it('Throws an error if used outside of a TreeViewRootContext provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const renderFn = (): ReturnType<typeof renderHook> => renderHook(useTreeViewRootContext);
    expect(renderFn).toThrow(
      'useTreeViewRootContext must be used within the TreeViewRoot component.',
    );
  });
});
