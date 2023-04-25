import type { ReactNode } from 'react';
import React from 'react';
import configureStore from 'redux-mock-store';
import type { IAppDataState } from '../features/appData/appDataReducers';
import type {
  IAppState,
  IExternalFormLayout,
  IExternalFormLayouts,
  IFormComponent,
  IInternalLayout,
} from '../types/global';
import type { ITextResourcesState } from '../features/appData/textResources/textResourcesSlice';
import { IServiceConfigurationState } from '../features/serviceConfigurations/serviceConfigurationTypes';
import { Provider } from 'react-redux';
import { render, renderHook } from '@testing-library/react';
import {
  ServicesContextProps,
  ServicesContextProvider,
} from '../../../../app-development/common/ServiceContext';
import { IFormDesignerState } from '../features/formDesigner/formDesignerReducer';
import { ComponentType } from '../components';
import { ILayoutSettings } from 'app-shared/types/global';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { BrowserRouter } from 'react-router-dom';
import ruleHandlerMock from './ruleHandlerMock';

export const textResourcesMock: ITextResourcesState = {
  currentEditId: undefined,
};

export const appDataMock: IAppDataState = {
  textResources: textResourcesMock,
};

export const layout1NameMock = 'Side1';
export const layout2NameMock = 'Side2';

export const formDesignerMock: IFormDesignerState = {
  layout: {
    error: null,
    saving: false,
    unSavedChanges: false,
    activeContainer: '',
    activeList: null,
    selectedLayout: layout1NameMock,
    invalidLayouts: [],
  },
};

export const serviceConfigurationsMock: IServiceConfigurationState = {
  conditionalRendering: null,
  manageServiceConfiguration: null,
  ruleConnection: null,
};

export const appStateMock: IAppState = {
  appData: appDataMock,
  errors: null,
  formDesigner: formDesignerMock,
  serviceConfigurations: serviceConfigurationsMock,
  widgets: null,
};

export const baseContainerIdMock = BASE_CONTAINER_ID;
export const component1IdMock = 'Component-1';
export const component1TypeMock = ComponentType.Input;
export const component1Mock: IFormComponent = {
  id: component1IdMock,
  type: component1TypeMock,
  itemType: 'COMPONENT',
};
export const component2IdMock = 'Component-2';
export const component2TypeMock = ComponentType.Paragraph;
export const component2Mock: IFormComponent = {
  id: component2IdMock,
  type: component2TypeMock,
  itemType: 'COMPONENT',
};
export const container1IdMock = 'Container-1';
export const layoutMock: IInternalLayout = {
  components: {
    [component1IdMock]: component1Mock,
    [component2IdMock]: component2Mock,
  },
  containers: {
    [baseContainerIdMock]: {
      itemType: 'CONTAINER',
    },
    [container1IdMock]: {
      itemType: 'CONTAINER',
    },
  },
  order: {
    [baseContainerIdMock]: [container1IdMock],
    [container1IdMock]: [component1IdMock, component2IdMock],
  },
};

export const layout1Mock: IExternalFormLayout = {
  $schema: 'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json',
  data: {
    layout: [
      {
        id: container1IdMock,
        type: ComponentType.Group,
        children: [component1IdMock, component2IdMock],
      },
      {
        id: component1IdMock,
        type: component1TypeMock,
      },
      {
        id: component2IdMock,
        type: component2TypeMock,
      },
    ],
  },
};
const layout2Mock: IExternalFormLayout = {
  $schema: 'https://altinncdn.no/schemas/json/layout/layout.schema.v1.json',
  data: {
    layout: [],
  },
};
export const externalLayoutsMock: IExternalFormLayouts = {
  [layout1NameMock]: layout1Mock,
  [layout2NameMock]: layout2Mock,
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
  getRuleModel: jest.fn().mockImplementation(() => Promise.resolve(ruleHandlerMock)),
  getTextLanguages: jest.fn().mockImplementation(() => Promise.resolve(textLanguagesMock)),
  getTextResources: jest.fn().mockImplementation(() => Promise.resolve([])),
  getUser: jest.fn(),
  pushRepoChanges: jest.fn(),
  saveFormLayout: jest.fn().mockImplementation(() => Promise.resolve({})),
  saveFormLayoutSettings: jest.fn().mockImplementation(() => Promise.resolve({})),
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
        <Provider store={store}>
          <BrowserRouter>{component}</BrowserRouter>
        </Provider>
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
          <Provider store={store}>{children}</Provider>
        </ServicesContextProvider>
      ),
    });
    return { renderHookResult, store };
  };
