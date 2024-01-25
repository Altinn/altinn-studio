import type { ReactNode } from 'react';
import React from 'react';
import { render } from '@testing-library/react';
import type { SchemaEditorAppContextProps } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { SchemaEditorAppContext } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { uiSchemaNodesMock } from './mocks/uiSchemaMock';
import { SchemaModel } from '../../schema-model';

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
      save: jest.fn(),
      selectedNodePointer: null,
      setSelectedNodePointer: jest.fn(),
      selectedTypePointer: null,
      setSelectedTypePointer: jest.fn(),
      name,
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
        save: jest.fn(),
        selectedNodePointer: null,
        setSelectedNodePointer: jest.fn(),
        selectedTypePointer: null,
        setSelectedTypePointer: jest.fn(),
        name,
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
