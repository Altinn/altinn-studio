import type { ReactNode } from 'react';
import React from 'react';
import { renderHook } from '@testing-library/react';
import type { RenderWithProvidersData } from './renderWithProviders';
import type { SchemaEditorAppContextProps } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { SchemaEditorAppContext } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { uiSchemaNodesMock } from './mocks/uiSchemaMock';
import { SchemaModel } from '@altinn/schema-model';
import { composeWrappers, type WrapperFunction } from '@studio/testing/composeWrappers';

function createDefaultSchemaContextProps(
  appContextProps: Partial<SchemaEditorAppContextProps> = {},
): SchemaEditorAppContextProps {
  return {
    schemaModel: SchemaModel.fromArray(uiSchemaNodesMock),
    save: jest.fn(),
    selectedUniquePointer: null,
    setSelectedUniquePointer: jest.fn(),
    selectedTypePointer: null,
    setSelectedTypePointer: jest.fn(),
    name: 'Test',
    ...appContextProps,
  };
}

function withSchemaEditorAppContext(
  appContextProps: Partial<SchemaEditorAppContextProps> = {},
): WrapperFunction {
  const contextValue = createDefaultSchemaContextProps(appContextProps);
  return (children: ReactNode) => (
    <SchemaEditorAppContext.Provider value={contextValue}>
      {children}
    </SchemaEditorAppContext.Provider>
  );
}

export const renderHookWithProviders =
  (
    { appContextProps = {} }: RenderWithProvidersData = {
      appContextProps: {},
    },
  ) =>
  (hook: () => any) => {
    const Wrapper = composeWrappers([withSchemaEditorAppContext(appContextProps)]);

    const result = renderHook(hook, { wrapper: Wrapper });

    const rerender = (
      { appContextProps: rerenderAppContextProps = {} }: RenderWithProvidersData = {
        appContextProps: {},
      },
    ) => {
      const newContextProps = createDefaultSchemaContextProps({
        ...appContextProps,
        ...rerenderAppContextProps,
      });

      return (rerenderElement: ReactNode) =>
        result.rerender(
          <SchemaEditorAppContext.Provider value={newContextProps}>
            {rerenderElement}
          </SchemaEditorAppContext.Provider>,
        );
    };

    return { ...result, rerender };
  };
