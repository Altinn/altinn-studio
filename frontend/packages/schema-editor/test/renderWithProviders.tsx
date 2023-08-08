import React, { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { SchemaEditorAppContext, SchemaEditorAppContextProps } from '@altinn/schema-editor/SchemaEditorAppContext';
import { SchemaState } from '@altinn/schema-editor/types';
import configureStore from 'redux-mock-store';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { queryClientMock } from './mocks/queryClientMock';

export interface RenderWithProvidersData {
  state?: Partial<SchemaState>,
  servicesContextProps?: Partial<ServicesContextProps>,
  appContextProps?: Partial<SchemaEditorAppContextProps>,
}

export const renderWithProviders = ({
  state = {},
  servicesContextProps = {},
  appContextProps = {},
}: RenderWithProvidersData = {
  state: {},
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

  const allAppContextProps: SchemaEditorAppContextProps = {
    modelPath: '',
    ...appContextProps,
  };

  const store = configureStore()(allStateProps);

  const result = render(
    <Provider store={store}>
      <ServicesContextProvider {...allServicesContextProps} client={queryClientMock}>
        <SchemaEditorAppContext.Provider value={allAppContextProps}>
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
        <ServicesContextProvider {...newServicesContextProps} client={queryClientMock}>
          <SchemaEditorAppContext.Provider value={newAppContextProps}>
            {rerenderElement}
          </SchemaEditorAppContext.Provider>
        </ServicesContextProvider>
      </Provider>
    );
  };

  return { ...result, store, rerender };
};
