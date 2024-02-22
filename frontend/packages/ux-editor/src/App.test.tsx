import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { formLayoutSettingsMock, renderWithProviders } from './testing/mocks';
import { App } from './App';
import { textMock } from '../../../testing/mocks/i18nMock';
import { typedLocalStorage } from 'app-shared/utils/webStorage';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { appStateMock } from './testing/stateMocks';
import type { AppContextProps } from './AppContext';
import ruleHandlerMock from './testing/ruleHandlerMock';
import { layoutSetsMock } from './testing/layoutMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { SupportedFeatureFlags } from 'app-shared/utils/featureToggleUtils';

const { selectedLayoutSet } = appStateMock.formDesigner.layout;
const mockQueries: Partial<ServicesContextProps> = {
  getInstanceIdForPreview: jest.fn().mockImplementation(() => Promise.resolve('test')),
  getRuleModel: jest.fn().mockImplementation(() => Promise.resolve(ruleHandlerMock)),
  getLayoutSets: jest.fn().mockImplementation(() => Promise.resolve(layoutSetsMock)),
  getFormLayoutSettings: jest
    .fn()
    .mockImplementation(() => Promise.resolve(formLayoutSettingsMock)),
};

const renderApp = (
  queries: Partial<ServicesContextProps> = {},
  appContextProps: Partial<AppContextProps> = {},
) => {
  const queryClient = createQueryClientMock();
  return renderWithProviders(<App />, {
    queries,
    appContextProps,
    queryClient,
  });
};

describe('App', () => {
  afterEach(() => typedLocalStorage.setItem('featureFlags', []));

  it('should render the spinner', () => {
    overrideFrontendVersionCheck();
    renderApp({}, { selectedLayoutSet });
    expect(screen.getByTitle(textMock('ux_editor.loading_page'))).toBeInTheDocument();
  });

  it('should render the component', async () => {
    overrideFrontendVersionCheck();
    renderApp(mockQueries, { selectedLayoutSet });
    await waitForLoadingToFinish();
  });

  it('Removes the preview layout set from local storage if it does not exist', async () => {
    overrideFrontendVersionCheck();
    const removeSelectedLayoutSetMock = jest.fn();
    const layoutSetThatDoesNotExist = 'layout-set-that-does-not-exist';
    typedLocalStorage.setItem('selectedLayoutSet', layoutSetThatDoesNotExist);
    renderApp(mockQueries, {
      selectedLayoutSet: layoutSetThatDoesNotExist,
      removeSelectedLayoutSet: removeSelectedLayoutSetMock,
    });
    await waitForLoadingToFinish();
    expect(removeSelectedLayoutSetMock).toHaveBeenCalledTimes(1);
  });

  it('Does not remove the preview layout set from local storage if it exists', async () => {
    overrideFrontendVersionCheck();
    const removeSelectedLayoutSetMock = jest.fn();
    typedLocalStorage.setItem('selectedLayoutSet', selectedLayoutSet);
    renderApp(mockQueries, {
      selectedLayoutSet,
      removeSelectedLayoutSet: removeSelectedLayoutSetMock,
    });
    await waitForLoadingToFinish();
    expect(removeSelectedLayoutSetMock).not.toHaveBeenCalled();
  });

  it('Renders the unsupported version message by default', async () => {
    renderApp(mockQueries, { selectedLayoutSet });
    expect(
      screen.getByRole('heading', {
        name: textMock('ux_editor.unsupported_version_message_title', { version: 'V4' }),
      }),
    ).toBeInTheDocument();
  });

  it('Does not render the unsupported version message when the shouldOverrideAppFrontendCheck feature flag is set', async () => {
    overrideFrontendVersionCheck();
    renderApp(mockQueries, { selectedLayoutSet });
    await waitForLoadingToFinish();
    expect(
      screen.queryByRole('heading', {
        name: textMock('ux_editor.unsupported_version_message_title', { version: 'V4' }),
      }),
    ).not.toBeInTheDocument();
  });
});

const overrideFrontendVersionCheck = () =>
  typedLocalStorage.setItem('featureFlags', [
    'shouldOverrideAppFrontendCheck' satisfies SupportedFeatureFlags,
  ]);

const waitForLoadingToFinish = async () =>
  await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('ux_editor.loading_page')));
