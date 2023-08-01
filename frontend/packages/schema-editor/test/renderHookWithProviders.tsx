import React, { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { SelectedSchemaContext, SelectedSchemaContextProps } from '@altinn/schema-editor/contexts/SelectedSchemaContext';
import { SchemaState } from '@altinn/schema-editor/types';
import configureStore from 'redux-mock-store';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { RenderWithProvidersData } from './renderWithProviders';

export const renderHookWithProviders = ({
  state = {},
  queryClient = queryClientMock,
  servicesContextProps = {},
  selectedSchemaProps = {},
}: RenderWithProvidersData = {
  state: {},
  queryClient: queryClientMock,
  selectedSchemaProps: {},
  servicesContextProps: {}
}) => (hook: () => any) => {

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

  const result = renderHook(hook, {
    wrapper: ({ children }) => (
      <Provider store={configureStore()(allStateProps)}>
        <ServicesContextProvider {...allServicesContextProps} client={queryClient}>
          <SelectedSchemaContext.Provider value={allSelectedSchemaContextProps}>
            {children}
          </SelectedSchemaContext.Provider>
        </ServicesContextProvider>
      </Provider>
    )
  });

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

  return { ...result, rerender };
};
