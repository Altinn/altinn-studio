import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { formLayoutSettingsMock, renderWithProviders } from './testing/mocks';
import { App } from './App';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { typedLocalStorage } from '@studio/pure-functions';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { AppContextProps } from './AppContext';
import { layoutSetsMock } from './testing/layoutSetsMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { user as userMock } from 'app-shared/mocks/mocks';
import { QueryKey } from 'app-shared/types/QueryKey';
import { PreviewContextProvider } from 'app-development/contexts/PreviewContext';

const mockQueries: Partial<ServicesContextProps> = {
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
  queryClient.setQueryData([QueryKey.CurrentUser], [userMock]);
  return renderWithProviders(
    <PreviewContextProvider>
      <App />
    </PreviewContextProvider>,
    {
      queries,
      appContextProps,
      queryClient,
    },
  );
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
});

const waitForLoadingToFinish = async () =>
  await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('ux_editor.loading_page')));
