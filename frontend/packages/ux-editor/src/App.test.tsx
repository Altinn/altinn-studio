import React from 'react';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
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
    renderApp({}, { selectedLayoutSet });
    expect(screen.getByTitle(textMock('ux_editor.loading_page'))).toBeInTheDocument();
  });

  it('should render the component', async () => {
    renderApp(mockQueries, { selectedLayoutSet });
    await waitForLoadingToFinish();
  });

  it('Sets a new initial layout set as selected if current does not exist', async () => {
    const setSelectedLayoutSetMock = jest.fn();
    const layoutSetThatDoesNotExist = 'layout-set-that-does-not-exist';
    typedLocalStorage.setItem('selectedLayoutSet', layoutSetThatDoesNotExist);
    renderApp(mockQueries, {
      selectedLayoutSet: layoutSetThatDoesNotExist,
      setSelectedLayoutSet: setSelectedLayoutSetMock,
    });
    await waitFor(() => expect(setSelectedLayoutSetMock).toHaveBeenCalledTimes(1));
    expect(setSelectedLayoutSetMock).toHaveBeenCalledWith(layoutSetsMock.sets[0].id);
  });

  it('Does not remove the preview layout set from local storage if it exists', async () => {
    const removeSelectedLayoutSetMock = jest.fn();
    typedLocalStorage.setItem('selectedLayoutSet', selectedLayoutSet);
    renderApp(mockQueries, {
      selectedLayoutSet,
      removeSelectedLayoutSet: removeSelectedLayoutSetMock,
    });
    await waitForLoadingToFinish();
    expect(removeSelectedLayoutSetMock).not.toHaveBeenCalled();
  });
});

const waitForLoadingToFinish = async () =>
  await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('ux_editor.loading_page')));
