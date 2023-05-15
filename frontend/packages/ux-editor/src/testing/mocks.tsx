import type { ReactNode } from 'react';
import React from 'react';
import configureStore from 'redux-mock-store';
import type { IAppDataState } from '../features/appData/appDataReducers';
import type { IAppState } from '../types/global';
import type { ITextResourcesState } from '../features/appData/textResources/textResourcesSlice';
import { Provider } from 'react-redux';
import { render, renderHook } from '@testing-library/react';
import {
  ServicesContextProps,
  ServicesContextProvider,
} from '../../../../app-development/common/ServiceContext';
import { IFormDesignerState } from '../features/formDesigner/formDesignerReducer';
import { ILayoutSettings } from 'app-shared/types/global';
import { BrowserRouter } from 'react-router-dom';
import ruleHandlerMock from './ruleHandlerMock';
import { PreviewConnectionContextProvider } from "app-shared/providers/PreviewConnectionContext";
import { ruleConfig as ruleConfigMock } from './ruleConfigMock';
import { externalLayoutsMock, layout1NameMock, layout2NameMock } from './layoutMock';

export const textResourcesMock: ITextResourcesState = {
  currentEditId: undefined,
};

export const appDataMock: IAppDataState = {
  textResources: textResourcesMock,
};

export const formDesignerMock: IFormDesignerState = {
  layout: {
    error: null,
    saving: false,
    unSavedChanges: false,
    selectedLayout: layout1NameMock,
    invalidLayouts: [],
  },
};

export const appStateMock: IAppState = {
  appData: appDataMock,
  errors: null,
  formDesigner: formDesignerMock,
};

export const formLayoutSettingsMock: ILayoutSettings = {
  pages: {
    order: [layout1NameMock, layout2NameMock],
  },
};

export const textLanguagesMock = ['nb', 'nn', 'en'];

export const queriesMock: ServicesContextProps = {
  addAppAttachmentMetadata: jest.fn().mockImplementation(() => Promise.resolve({})),
  addLanguageCode: jest.fn(),
  createDeployment: jest.fn(),
  createRelease: jest.fn(),
  createRepoCommit: jest.fn(),
  deleteAppAttachmentMetadata: jest.fn().mockImplementation(() => Promise.resolve({})),
  deleteFormLayout: jest.fn().mockImplementation(() => Promise.resolve({})),
  deleteLanguageCode: jest.fn(),
  getAppReleases: jest.fn(),
  getBranchStatus: jest.fn(),
  getDatamodel: jest.fn(),
  getDatamodelsXsd: jest.fn(),
  getDeployPermissions: jest.fn(),
  getDeployments: jest.fn(),
  getEnvironments: jest.fn(),
  getFormLayoutSettings: jest.fn().mockImplementation(() => Promise.resolve(formLayoutSettingsMock)),
  getFormLayouts: jest.fn().mockImplementation(() => Promise.resolve(externalLayoutsMock)),
  getOrgList: jest.fn(),
  getRepoMetadata: jest.fn(),
  getRepoPull: jest.fn(),
  getRepoStatus: jest.fn(),
  getRuleConfig: jest.fn().mockImplementation(() => Promise.resolve(ruleConfigMock)),
  getRuleModel: jest.fn().mockImplementation(() => Promise.resolve(ruleHandlerMock)),
  getTextLanguages: jest.fn().mockImplementation(() => Promise.resolve(textLanguagesMock)),
  getTextResources: jest.fn().mockImplementation(() => Promise.resolve([])),
  getUser: jest.fn(),
  getWidgetSettings: jest.fn().mockImplementation(() => Promise.resolve({})),
  pushRepoChanges: jest.fn(),
  saveFormLayout: jest.fn().mockImplementation(() => Promise.resolve({})),
  saveFormLayoutSettings: jest.fn().mockImplementation(() => Promise.resolve({})),
  saveRuleConfig: jest.fn(),
  updateAppAttachmentMetadata: jest.fn().mockImplementation(() => Promise.resolve({})),
  updateFormLayoutName: jest.fn().mockImplementation(() => Promise.resolve({})),
  updateTextId: jest.fn(),
  updateTranslationByLangCode: jest.fn(),
  upsertTextResources: jest.fn().mockImplementation(() => Promise.resolve()),
};

export const renderWithMockStore =
  (state: Partial<IAppState> = {}, queries: Partial<ServicesContextProps> = {}) =>
    (component: ReactNode) => {
      const store = configureStore()({ ...appStateMock, ...state });
      const renderResult = render(
        <ServicesContextProvider {...queriesMock} {...queries}>
          <PreviewConnectionContextProvider>
            <Provider store={store}>
              <BrowserRouter>{component}</BrowserRouter>
            </Provider>
          </PreviewConnectionContextProvider>
        </ServicesContextProvider>
      );
      return { renderResult, store };
    };

export const renderHookWithMockStore =
  (state: Partial<IAppState> = {}, queries: Partial<ServicesContextProps> = {}) =>
    (hook: () => any) => {
      const store = configureStore()({ ...appStateMock, ...state });
      const renderHookResult = renderHook(hook, {
        wrapper: ({ children }) => (
          <ServicesContextProvider {...queriesMock} {...queries}>
            <PreviewConnectionContextProvider>
              <Provider store={store}>{children}</Provider>
            </PreviewConnectionContextProvider>
          </ServicesContextProvider>
        ),
      });
      return { renderHookResult, store };
    };
