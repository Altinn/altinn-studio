import React, { type ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import type { RenderWithProvidersData } from './renderWithProviders';
import {
  SchemaEditorAppContext,
  type SchemaEditorAppContextProps,
} from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { uiSchemaNodesMock } from './mocks/uiSchemaMock';
import { SchemaModel } from '@altinn/schema-model';

export const renderHookWithProviders =
  (
    { appContextProps = {} }: RenderWithProvidersData = {
      appContextProps: {},
    },
  ) =>
  (hook: () => any) => {
    const allSelectedSchemaContextProps: SchemaEditorAppContextProps = {
      schemaModel: SchemaModel.fromArray(uiSchemaNodesMock),
      save: jest.fn(),
      selectedNodePointer: null,
      setSelectedNodePointer: jest.fn(),
      selectedTypePointer: null,
      setSelectedTypePointer: jest.fn(),
      name: 'Test',
      ...appContextProps,
    };

    const result = renderHook(hook, {
      wrapper: ({ children }) => (
        <SchemaEditorAppContext.Provider value={allSelectedSchemaContextProps}>
          {children}
        </SchemaEditorAppContext.Provider>
      ),
    });

    const rerender = (
      { appContextProps: rerenderAppContextProps = {} }: RenderWithProvidersData = {
        appContextProps: {},
      },
    ) => {
      const newAppContextProps: SchemaEditorAppContextProps = {
        ...allSelectedSchemaContextProps,
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
