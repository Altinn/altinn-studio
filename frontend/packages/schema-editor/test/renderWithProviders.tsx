import React, { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import {
  SchemaEditorAppContext,
  SchemaEditorAppContextProps,
} from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { SchemaState } from '@altinn/schema-editor/types';
import configureStore from 'redux-mock-store';
import { uiSchemaNodesMock } from './mocks/uiSchemaMock';
import { SchemaModel } from '../../schema-model';

export interface RenderWithProvidersData {
  state?: Partial<SchemaState>;
  appContextProps?: Partial<SchemaEditorAppContextProps>;
}

export const renderWithProviders =
  (
    { state = {}, appContextProps = {} }: RenderWithProvidersData = {
      state: {},
      appContextProps: {},
    },
  ) =>
  (element: ReactNode) => {
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

    const store = configureStore()(allStateProps);

    const result = render(
      <Provider store={store}>
        <SchemaEditorAppContext.Provider value={allSelectedSchemaContextProps}>
          {element}
        </SchemaEditorAppContext.Provider>
      </Provider>,
    );

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
        schemaModel: SchemaModel.fromArray(uiSchemaNodesMock),
        save: jest.fn(),
        setSelectedTypePointer: jest.fn(),
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

    return { ...result, store, rerender };
  };
