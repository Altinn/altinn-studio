import { vi } from 'vitest';
import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import type { SchemaEditorAppContextProps } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { SchemaEditorAppContext } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { uiSchemaNodesMock } from './mocks/uiSchemaMock';
import { SchemaModel } from '@altinn/schema-model';

export interface RenderWithProvidersData {
  appContextProps?: Partial<SchemaEditorAppContextProps>;
}

export const renderWithProviders =
  (
    { appContextProps = {} }: RenderWithProvidersData = {
      appContextProps: {},
    },
  ) =>
  (element: ReactNode) => {
    const name = 'Test';

    const allSelectedSchemaContextProps: SchemaEditorAppContextProps = {
      schemaModel: SchemaModel.fromArray(uiSchemaNodesMock),
      save: vi.fn(),
      selectedUniquePointer: null,
      setSelectedUniquePointer: vi.fn(),
      selectedTypePointer: null,
      setSelectedTypePointer: vi.fn(),
      name,
      prefillConfig: {},
      savePrefillConfig: vi.fn(),
      ...appContextProps,
    };

    const result = render(
      <SchemaEditorAppContext.Provider value={allSelectedSchemaContextProps}>
        {element}
      </SchemaEditorAppContext.Provider>,
    );

    const rerender = (
      { appContextProps: rerenderAppContextProps = {} }: RenderWithProvidersData = {
        appContextProps: {},
      },
    ) => {
      const newAppContextProps: SchemaEditorAppContextProps = {
        schemaModel: SchemaModel.fromArray(uiSchemaNodesMock),
        save: vi.fn(),
        selectedUniquePointer: null,
        setSelectedUniquePointer: vi.fn(),
        selectedTypePointer: null,
        setSelectedTypePointer: vi.fn(),
        name,
        prefillConfig: {},
        savePrefillConfig: vi.fn(),
        ...rerenderAppContextProps,
      };

      return (rerenderElement: ReactNode) =>
        result.rerender(
          <SchemaEditorAppContext.Provider value={newAppContextProps}>
            {rerenderElement}
          </SchemaEditorAppContext.Provider>,
        );
    };

    return { ...result, rerender };
  };
