import React, { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { SchemaEditorAppContext, SchemaEditorAppContextProps } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { SchemaState } from '@altinn/schema-editor/types';
import configureStore from 'redux-mock-store';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { QueryClient } from '@tanstack/react-query';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';

export interface RenderWithProvidersData {
  state?: Partial<SchemaState>,
  queryClient?: QueryClient,
  servicesContextProps?: Partial<ServicesContextProps>,
  appContextProps?: Partial<SchemaEditorAppContextProps>,
}

export const renderWithProviders = ({
  state = {},
  queryClient = queryClientMock,
  servicesContextProps = {},
  appContextProps = {},
}: RenderWithProvidersData = {
  state: {},
  queryClient: queryClientMock,
  appContextProps: {},
  servicesContextProps: {}
}) => (element: ReactNode) => {

  const allStateProps: SchemaState = {
    selectedEditorTab: null,
    selectedPropertyNodeId: null,
    name: null,
    selectedDefinitionNodeId: null,
    ...state,
  };

  const allServicesContextProps: ServicesContextProps = {
    ...queriesMock,
    ...servicesContextProps,
  };

  const allSelectedSchemaContextProps: SchemaEditorAppContextProps = {
    modelPath: '',
    ...appContextProps,
  };

  const store = configureStore()(allStateProps);

  const result = render(
    <Provider store={store}>
      <ServicesContextProvider {...allServicesContextProps} client={queryClient}>
        <SchemaEditorAppContext.Provider value={allSelectedSchemaContextProps}>
          {element}
        </SchemaEditorAppContext.Provider>
      </ServicesContextProvider>
    </Provider>
  );

  const rerender = ({
    state: rerenderState = {},
    servicesContextProps: rerenderServicesContextProps = {},
    appContextProps: rerenderAppContextProps = {},
  }: RenderWithProvidersData = {
    state: {},
    appContextProps: {},
    servicesContextProps: {},
  }) => {
    const newStateProps: SchemaState = {
      selectedEditorTab: null,
      selectedPropertyNodeId: null,
      name: null,
      selectedDefinitionNodeId: null,
      ...rerenderState,
    };

    const newServicesContextProps: ServicesContextProps = {
      ...queriesMock,
      ...rerenderServicesContextProps,
    };

    const newAppContextProps: SchemaEditorAppContextProps = {
      modelPath: '',
      ...rerenderAppContextProps,
    };

    return (rerenderElement: ReactNode) => result.rerender(
      <Provider store={configureStore()(newStateProps)}>
        <ServicesContextProvider {...newServicesContextProps} client={queryClient}>
          <SchemaEditorAppContext.Provider value={newAppContextProps}>
            {rerenderElement}
          </SchemaEditorAppContext.Provider>
        </ServicesContextProvider>
      </Provider>
    );
  };

  return { ...result, store, rerender };
};
