import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSchemaEditorAppContext } from './useSchemaEditorAppContext';
import type { SchemaEditorAppContextProps } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { SchemaEditorAppContext } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { uiSchemaNodesMock } from '../../test/mocks/uiSchemaMock';
import { SchemaModel } from '@altinn/schema-model';

describe('useSchemaEditorAppContext', () => {
  it('Returns the provided context value if used inside a SchemaEditorAppContextProvider', () => {
    const schemaModel: SchemaModel = SchemaModel.fromArray(uiSchemaNodesMock);
    const save = vi.fn();
    const providedContext: SchemaEditorAppContextProps = {
      schemaModel,
      save,
      setSelectedTypePointer: vi.fn(),
      setSelectedUniquePointer: vi.fn(),
      name: 'test',
      prefillConfig: {},
      savePrefillConfig: vi.fn(),
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
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(renderHookFn).toThrow(
      'useSchemaEditorAppContext must be used within a SchemaEditorAppContextProvider.',
    );
  });
});
