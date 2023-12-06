import React, { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { SchemaState } from '@altinn/schema-editor/types';
import configureStore from 'redux-mock-store';
import { RenderWithProvidersData } from './renderWithProviders';
import {
  SchemaEditorAppContext,
  SchemaEditorAppContextProps,
} from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { uiSchemaNodesMock } from './mocks/uiSchemaMock';
import { SchemaModel } from '../../schema-model';

export const renderHookWithProviders =
  (
    { state = {}, appContextProps = {} }: RenderWithProvidersData = {
      state: {},
      appContextProps: {},
    },
  ) =>
  (hook: () => any) => {
    const allStateProps: SchemaState = {
      selectedEditorTab: null,
      selectedPropertyNodeId: null,
      name: null,
      selectedDefinitionNodeId: null,
      ...state,
    };

    const allSelectedSchemaContextProps: SchemaEditorAppContextProps = {
      schemaModel: SchemaModel.fromArray(uiSchemaNodesMock),
      save: jest.fn(),
      setSelectedTypePointer: jest.fn(),
      ...appContextProps,
    };

    const result = renderHook(hook, {
      wrapper: ({ children }) => (
        <Provider store={configureStore()(allStateProps)}>
          <SchemaEditorAppContext.Provider value={allSelectedSchemaContextProps}>
            {children}
          </SchemaEditorAppContext.Provider>
        </Provider>
      ),
    });

    const rerender = (
      {
        state: rerenderState = {},
        appContextProps: rerenderAppContextProps = {},
      }: RenderWithProvidersData = {
        state: {},
        appContextProps: {},
      },
    ) => {
      const newStateProps: SchemaState = {
        selectedEditorTab: null,
        selectedPropertyNodeId: null,
        name: null,
        selectedDefinitionNodeId: null,
        ...rerenderState,
      };

      const newAppContextProps: SchemaEditorAppContextProps = {
        ...allSelectedSchemaContextProps,
        ...rerenderAppContextProps,
      };

      return (rerenderElement: ReactNode) =>
        result.rerender(
          <Provider store={configureStore()(newStateProps)}>
            <SchemaEditorAppContext.Provider value={newAppContextProps}>
              {rerenderElement}
            </SchemaEditorAppContext.Provider>
          </Provider>,
        );
    };

    return { ...result, rerender };
  };
