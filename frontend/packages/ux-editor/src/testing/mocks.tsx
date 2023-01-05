import type { IAppState } from '../types/global';
import type { IAppDataState } from '../features/appData/appDataReducers';
import type { ITextResourcesState } from '../features/appData/textResources/textResourcesSlice';
import { render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import React from 'react';
import type { ILanguageState } from '../features/appData/language/languageSlice';
import { IServiceConfigurationState } from '../features/serviceConfigurations/serviceConfigurationTypes';
import { IDataModelState } from '../features/appData/dataModel/dataModelSlice';

export const textResourcesMock: ITextResourcesState = {
  currentEditId: undefined,
  error: null,
  fetched: true,
  fetching: false,
  language: null,
  languages: [],
  resources: { nb: [] },
  saved: true,
  saving: false,
}

export const dataModelStateMock: IDataModelState = {
  model: [],
  fetching: false,
  fetched: true,
  error: null,
}

export const languageStateMock: ILanguageState = {
  error: null,
  language: {},
}

export const appDataMock: IAppDataState = {
  dataModel: dataModelStateMock,
  languageState: languageStateMock,
  ruleModel: null,
  textResources: textResourcesMock,
}

export const serviceConfigurationsMock: IServiceConfigurationState = {
  conditionalRendering: null,
  manageServiceConfiguration: null,
  ruleConnection: null,
}

export const appStateMock: IAppState = {
  appData: appDataMock,
  errors: null,
  formDesigner: null,
  serviceConfigurations: serviceConfigurationsMock,
  widgets: null
}

export const renderWithMockStore = (state: Partial<IAppState> = {}) => (component: ReactNode) => {
  const store = configureStore()({ ...appStateMock, ...state });
  const renderResult = render(
    <Provider store={store}>
      {component}
    </Provider>
  );
  return { renderResult, store };
};

export const renderHookWithMockStore = (state: Partial<IAppState> = {}) => (hook: () => any) => {
  const store = configureStore()({ ...appStateMock, ...state });
  const renderHookResult = renderHook(hook, {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>
  });
  return { renderHookResult, store };
}
