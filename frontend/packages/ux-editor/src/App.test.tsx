import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { formLayoutSettingsMock, renderWithProviders } from './testing/mocks';
import { App } from './App';
import { textMock } from '../../../testing/mocks/i18nMock';
import { typedLocalStorage } from 'app-shared/utils/webStorage';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { AppContextProps } from './AppContext';
import ruleHandlerMock from './testing/ruleHandlerMock';
import { layoutSetsMock, layout1NameMock } from './testing/layoutMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const selectedFormLayoutSetName = layout1NameMock;
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
    renderApp({}, { selectedFormLayoutSetName });
    expect(screen.getByTitle(textMock('ux_editor.loading_page'))).toBeInTheDocument();
  });

  it('should render the component', async () => {
    renderApp(mockQueries, { selectedFormLayoutSetName });
    await waitForLoadingToFinish();
  });

  it('Removes the preview layout set from local storage if it does not exist', async () => {
    const removeSelectedLayoutSetMock = jest.fn();
    const layoutSetThatDoesNotExist = 'layout-set-that-does-not-exist';
    typedLocalStorage.setItem('selectedLayoutSet', layoutSetThatDoesNotExist);
    renderApp(mockQueries, {
      selectedFormLayoutSetName: layoutSetThatDoesNotExist,
      removeSelectedFormLayoutSetName: removeSelectedLayoutSetMock,
    });
    await waitForLoadingToFinish();
    expect(removeSelectedLayoutSetMock).toHaveBeenCalledTimes(1);
  });

  it('Does not remove the preview layout set from local storage if it exists', async () => {
    const removeSelectedLayoutSetMock = jest.fn();
    typedLocalStorage.setItem('selectedLayoutSet', selectedFormLayoutSetName);
    renderApp(mockQueries, {
      selectedFormLayoutSetName,
      removeSelectedFormLayoutSetName: removeSelectedLayoutSetMock,
    });
    await waitForLoadingToFinish();
    expect(removeSelectedLayoutSetMock).not.toHaveBeenCalled();
  });
});

const waitForLoadingToFinish = async () =>
  await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('ux_editor.loading_page')));
