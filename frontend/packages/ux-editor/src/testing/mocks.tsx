import React from 'react';
import configureStore from 'redux-mock-store';
import type { IAppDataState } from '../features/appData/appDataReducers';
import type { IAppState, IDataModelFieldElement } from '../types/global';
import type { ITextResourcesState } from '../features/appData/textResources/textResourcesSlice';
import type { ReactNode } from 'react';
import { IServiceConfigurationState } from '../features/serviceConfigurations/serviceConfigurationTypes';
import { Provider } from 'react-redux';
import { render, renderHook } from '@testing-library/react';
import {
  ServicesContextProps,
  ServicesContextProvider,
} from '../../../../app-development/common/ServiceContext';

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
};

export const dataModelItemMock: IDataModelFieldElement = {
  dataBindingName: '',
  displayString: '',
  id: '',
  isReadOnly: false,
  isTagContent: false,
  jsonSchemaPointer: '',
  maxOccurs: 0,
  minOccurs: 0,
  name: '',
  parentElement: '',
  restrictions: undefined,
  texts: undefined,
  type: '',
  xmlSchemaXPath: '',
  xPath: '',
};

export const appDataMock: IAppDataState = {
  ruleModel: null,
  textResources: textResourcesMock,
};

export const serviceConfigurationsMock: IServiceConfigurationState = {
  conditionalRendering: null,
  manageServiceConfiguration: null,
  ruleConnection: null,
};

export const appStateMock: IAppState = {
  appData: appDataMock,
  errors: null,
  formDesigner: null,
  serviceConfigurations: serviceConfigurationsMock,
  widgets: null,
};

export const queriesMock: Partial<ServicesContextProps> = {
  addLanguageCode: jest.fn(),
  createDeployment: jest.fn(),
  createRelease: jest.fn(),
  createRepoCommit: jest.fn(),
  deleteLanguageCode: jest.fn(),
  getAppReleases: jest.fn(),
  getBranchStatus: jest.fn(),
  getDatamodel: jest.fn(),
  getDatamodelsXsd: jest.fn(),
  getDeployPermissions: jest.fn(),
  getDeployments: jest.fn(),
  getEnvironments: jest.fn(),
  getOrgList: jest.fn(),
  getRepoMetadata: jest.fn(),
  getRepoPull: jest.fn(),
  getRepoStatus: jest.fn(),
  getTextLanguages: jest.fn(),
  getTextResources: jest.fn(),
  pushRepoChanges: jest.fn(),
  updateTextId: jest.fn(),
  updateTranslationByLangCode: jest.fn(),
};

export const renderWithMockStore =
  (state: Partial<IAppState> = {}, queries: Partial<ServicesContextProps> = {}) =>
  (component: ReactNode) => {
    const store = configureStore()({ ...appStateMock, ...state });
    const renderResult = render(
      <ServicesContextProvider {...queriesMock} {...queries}>
        <Provider store={store}>{component}</Provider>
      </ServicesContextProvider>
    );
    return { renderResult, store };
  };

export const renderHookWithMockStore =
  (state: Partial<IAppState> = {}) =>
  (hook: () => any) => {
    const store = configureStore()({ ...appStateMock, ...state });
    const renderHookResult = renderHook(hook, {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });
    return { renderHookResult, store };
  };
