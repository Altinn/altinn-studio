import type { ReactNode } from 'react';
import React from 'react';
import configureStore from 'redux-mock-store';
import type { IAppState } from '../types/global';
import { Provider } from 'react-redux';
import { render, renderHook } from '@testing-library/react';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { ILayoutSettings } from 'app-shared/types/global';
import { BrowserRouter } from 'react-router-dom';
import ruleHandlerMock from './ruleHandlerMock';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';
import { ruleConfig as ruleConfigMock } from './ruleConfigMock';
import {
  externalLayoutsMock,
  layout1NameMock,
  layout2NameMock,
  layoutSetsMock,
} from './layoutMock';
import { appStateMock } from './stateMocks';
import { queriesMock as allQueriesMock } from 'app-shared/mocks/queriesMock';
import { QueryClient } from '@tanstack/react-query';
import expressionSchema from './schemas/json/layout/expression.schema.v1.json';
import numberFormatSchema from './schemas/json/layout/number-format.schema.v1.json';
import layoutSchema from './schemas/json/layout/layout.schema.v1.json';
import { AppContext, AppContextProps } from '../AppContext';
import { appContextMock } from './appContextMock';

export const formLayoutSettingsMock: ILayoutSettings = {
  pages: {
    order: [layout1NameMock, layout2NameMock],
  },
  receiptLayoutName: 'Kvittering',
};

export const textLanguagesMock = ['nb', 'nn', 'en'];

export const optionListIdsMock: string[] = ['test-1', 'test-2'];

export const queriesMock: ServicesContextProps = {
  ...allQueriesMock,
  addAppAttachmentMetadata: jest.fn().mockImplementation(() => Promise.resolve({})),
  addLayoutSet: jest.fn(),
  configureLayoutSet: jest.fn().mockImplementation(() => Promise.resolve({})),
  deleteAppAttachmentMetadata: jest.fn().mockImplementation(() => Promise.resolve({})),
  deleteFormLayout: jest.fn().mockImplementation(() => Promise.resolve({})),
  getDatamodelMetadata: jest.fn().mockImplementation(() => Promise.resolve({ elements: {} })),
  getExpressionSchema: jest.fn().mockImplementation(() => Promise.resolve(expressionSchema)),
  getFormLayoutSettings: jest
    .fn()
    .mockImplementation(() => Promise.resolve(formLayoutSettingsMock)),
  getFormLayouts: jest.fn().mockImplementation(() => Promise.resolve(externalLayoutsMock)),
  getFrontEndSettings: jest.fn().mockImplementation(() => Promise.resolve({})),
  getInstanceIdForPreview: jest.fn(),
  getLayoutSchema: jest.fn().mockImplementation(() => Promise.resolve(layoutSchema)),
  getLayoutSets: jest.fn().mockImplementation(() => Promise.resolve(layoutSetsMock)),
  getNumberFormatSchema: jest.fn().mockImplementation(() => Promise.resolve(numberFormatSchema)),
  getOptionListIds: jest.fn().mockImplementation(() => Promise.resolve(optionListIdsMock)),
  getRuleConfig: jest.fn().mockImplementation(() => Promise.resolve(ruleConfigMock)),
  getRuleModel: jest.fn().mockImplementation(() => Promise.resolve(ruleHandlerMock)),
  getTextLanguages: jest.fn().mockImplementation(() => Promise.resolve(textLanguagesMock)),
  getTextResources: jest.fn().mockImplementation(() => Promise.resolve([])),
  getWidgetSettings: jest.fn().mockImplementation(() => Promise.resolve({})),
  saveFormLayout: jest.fn().mockImplementation(() => Promise.resolve({})),
  saveFormLayoutSettings: jest.fn().mockImplementation(() => Promise.resolve({})),
  updateAppAttachmentMetadata: jest.fn().mockImplementation(() => Promise.resolve({})),
  updateFormLayoutName: jest.fn().mockImplementation(() => Promise.resolve({})),
  upsertTextResources: jest.fn().mockImplementation(() => Promise.resolve()),
};

export const queryClientMock = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity },
  },
});

type WrapperArgs = {
  appContextProps: Partial<AppContextProps>;
  queries: Partial<ServicesContextProps>;
  queryClient: QueryClient;
  state: Partial<IAppState>;
  storeCreator: ReturnType<typeof configureStore>;
};

const wrapper = ({
  appContextProps = {},
  queries = {},
  queryClient = queryClientMock,
  state = {},
  storeCreator,
}: WrapperArgs) => {
  const store = storeCreator({ ...appStateMock, ...state });
  const renderComponent = (component: ReactNode) => (
    <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
      <PreviewConnectionContextProvider>
        <Provider store={store}>
          <AppContext.Provider value={{ ...appContextMock, ...appContextProps }}>
            <BrowserRouter>{component}</BrowserRouter>
          </AppContext.Provider>
        </Provider>
      </PreviewConnectionContextProvider>
    </ServicesContextProvider>
  );
  return { store, renderComponent };
};

export const renderWithMockStore =
  (
    state: Partial<IAppState> = {},
    queries: Partial<ServicesContextProps> = {},
    queryClient: QueryClient = queryClientMock,
    appContextProps: Partial<AppContextProps> = {},
  ) =>
  (component: ReactNode) => {
    const storeCreator = configureStore();
    const { renderComponent, store } = wrapper({
      appContextProps,
      queries,
      queryClient,
      state,
      storeCreator,
    });
    const renderResult = render(renderComponent(component));
    const rerender = (rerenderedComponent) =>
      renderResult.rerender(renderComponent(rerenderedComponent));
    return { renderResult: { ...renderResult, rerender }, store };
  };

export const renderHookWithMockStore =
  (
    state: Partial<IAppState> = {},
    queries: Partial<ServicesContextProps> = {},
    queryClient: QueryClient = queryClientMock,
    appContextProps: Partial<AppContextProps> = {},
  ) =>
  (hook: () => any) => {
    const storeCreator = configureStore();
    const { renderComponent, store } = wrapper({
      appContextProps,
      queries,
      queryClient,
      state,
      storeCreator,
    });
    const renderHookResult = renderHook(hook, {
      wrapper: ({ children }) => renderComponent(children),
    });
    return { renderHookResult, store };
  };
