import React from 'react';
import { renderHook } from '@testing-library/react';
import { useSchemaEditorAppContext } from './useSchemaEditorAppContext';
import type { SchemaEditorAppContextProps } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { SchemaEditorAppContext } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { uiSchemaNodesMock } from '../../test/mocks/uiSchemaMock';
import { SchemaModel } from '@altinn/schema-model';

describe('useSchemaEditorAppContext', () => {
  it('Returns the provided context value if used inside a SchemaEditorAppContextProvider', () => {
    const schemaModel: SchemaModel = SchemaModel.fromArray(uiSchemaNodesMock);
    const save = jest.fn();
    const providedContext: SchemaEditorAppContextProps = {
      schemaModel,
      save,
      setSelectedTypePointer: jest.fn(),
      setSelectedNodePointer: jest.fn(),
      name: 'test',
    };
    const { result } = renderHook(() => useSchemaEditorAppContext(), {
      wrapper: ({ children }) => (
        <SchemaEditorAppContext.Provider value={providedContext}>
          {children}
        </SchemaEditorAppContext.Provider>
      ),
    });
    expect(result.current).toBe(providedContext);
  });

  it('Throws an error if used outside a SchemaEditorAppContextProvider', () => {
    const renderHookFn = () => renderHook(() => useSchemaEditorAppContext());
    jest.spyOn(console, 'error').mockImplementation();
    expect(renderHookFn).toThrowError(
      'useSchemaEditorAppContext must be used within a SchemaEditorAppContextProvider.',
    );
  });
});
