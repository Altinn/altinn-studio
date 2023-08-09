import React, { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { SelectedSchemaContext, SelectedSchemaContextProps } from '@altinn/schema-editor/contexts/SelectedSchemaContext';
import { SchemaState } from '@altinn/schema-editor/types';
import configureStore from 'redux-mock-store';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { QueryClient } from '@tanstack/react-query';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';

export interface RenderWithProvidersData {
  state?: Partial<SchemaState>,
  queryClient?: QueryClient,
  servicesContextProps?: Partial<ServicesContextProps>,
  selectedSchemaProps?: Partial<SelectedSchemaContextProps>,
}

export const renderWithProviders = ({
  state = {},
  queryClient = queryClientMock,
  servicesContextProps = {},
  selectedSchemaProps = {},
}: RenderWithProvidersData = {
  state: {},
  queryClient: queryClientMock,
  selectedSchemaProps: {},
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

  const allSelectedSchemaContextProps: SelectedSchemaContextProps = {
    modelPath: '',
    ...selectedSchemaProps,
  };

  const store = configureStore()(allStateProps);

  const result = render(
    <Provider store={store}>
      <ServicesContextProvider {...allServicesContextProps} client={queryClient}>
        <SelectedSchemaContext.Provider value={allSelectedSchemaContextProps}>
          {element}
        </SelectedSchemaContext.Provider>
      </ServicesContextProvider>
    </Provider>
  );

  const rerender = ({
    state: rerenderState = {},
    servicesContextProps: rerenderServicesContextProps = {},
    selectedSchemaProps: rerenderAppContextProps = {},
  }: RenderWithProvidersData = {
    state: {},
    selectedSchemaProps: {},
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

    const newAppContextProps: SelectedSchemaContextProps = {
      modelPath: '',
      ...rerenderAppContextProps,
    };

    return (rerenderElement: ReactNode) => result.rerender(
      <Provider store={configureStore()(newStateProps)}>
        <ServicesContextProvider {...newServicesContextProps} client={queryClient}>
          <SelectedSchemaContext.Provider value={newAppContextProps}>
            {rerenderElement}
          </SelectedSchemaContext.Provider>
        </ServicesContextProvider>
      </Provider>
    );
  };

  return { ...result, store, rerender };
};
