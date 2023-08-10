import React from 'react';
import { renderHook } from '@testing-library/react';
import { useSchemaEditorAppContext } from './useSchemaEditorAppContext';
import { SchemaEditorAppContext, SchemaEditorAppContextProps } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';

describe('useSchemaEditorAppContext', () => {
  it('Returns the provided context value if used inside a SchemaEditorAppContextProvider', () => {
    const providedContext: SchemaEditorAppContextProps = {
      modelPath: '',
    };
    const { result } = renderHook(() => useSchemaEditorAppContext(), {
      wrapper: ({ children }) => (
        <SchemaEditorAppContext.Provider value={providedContext}>
          {children}
        </SchemaEditorAppContext.Provider>
      )
    });
    expect(result.current).toBe(providedContext);
  });

  it('Throws an error if used outside a SchemaEditorAppContextProvider', () => {
    const renderHookFn = () => renderHook(() => useSchemaEditorAppContext());
    jest.spyOn(console, 'error').mockImplementation();
    expect(renderHookFn).toThrowError('useSchemaEditorAppContext must be used within a SchemaEditorAppContextProvider.');
  });
});
