import React from 'react';
import { renderHook } from '@testing-library/react';
import { useSelectedSchemaContext } from './useSelectedSchemaContext';
import { SelectedSchemaContext, SelectedSchemaContextProps } from '@altinn/schema-editor/contexts/SelectedSchemaContext';

describe('useSelectedSchemaContext', () => {
  it('Returns the provided context value if used inside a SelectedSchemaContext', () => {
    const providedContext: SelectedSchemaContextProps = {
      modelPath: '',
    };
    const { result } = renderHook(() => useSelectedSchemaContext(), {
      wrapper: ({ children }) => (
        <SelectedSchemaContext.Provider value={providedContext}>
          {children}
        </SelectedSchemaContext.Provider>
      )
    });
    expect(result.current).toBe(providedContext);
  });

  it('Throws an error if used outside a SchemaEditorAppContextProvider', () => {
    const renderHookFn = () => renderHook(() => useSelectedSchemaContext());
    jest.spyOn(console, 'error').mockImplementation();
    expect(renderHookFn).toThrowError('useSelectedSchemaContext must be used within a SelectedSchemaContextProvider.');
  });
});
