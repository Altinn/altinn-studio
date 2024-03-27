import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { formLayoutSettingsMock, renderWithProviders } from './testing/mocks';
import { App } from './App';
import { textMock } from '../../../testing/mocks/i18nMock';
import { typedLocalStorage } from 'app-shared/utils/webStorage';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { AppContextProps } from './AppContext';
import ruleHandlerMock from './testing/ruleHandlerMock';
import { layoutSetsMock } from './testing/layoutMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { appContextMock } from './testing/appContextMock';

const selectedFormLayoutSetName = layoutSetsMock.sets[0].id;
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
  afterEach(() => {
    typedLocalStorage.setItem('featureFlags', []);
    jest.clearAllMocks();
  });

  it('should render the spinner', () => {
    renderApp();
    expect(screen.getByTitle(textMock('ux_editor.loading_page'))).toBeInTheDocument();
  });

  it('should render the component', async () => {
    renderApp(mockQueries);
    await waitForLoadingToFinish();
  });

  it('Removes the preview layout set from local storage if it does not exist', async () => {
    const layoutSetThatDoesNotExist = 'layout-set-that-does-not-exist';
    typedLocalStorage.setItem('selectedLayoutSet', layoutSetThatDoesNotExist);
    renderApp(mockQueries, {
      selectedFormLayoutSetName: layoutSetThatDoesNotExist,
    });
    await waitForLoadingToFinish();
    expect(appContextMock.removeSelectedFormLayoutSetName).toHaveBeenCalledTimes(1);
  });

  it('Does not remove the preview layout set from local storage if it exists', async () => {
    typedLocalStorage.setItem('selectedLayoutSet', selectedFormLayoutSetName);
    renderApp(mockQueries);
    await waitForLoadingToFinish();
    expect(appContextMock.removeSelectedFormLayoutSetName).not.toHaveBeenCalled();
  });
});

const waitForLoadingToFinish = async () =>
  await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('ux_editor.loading_page')));
