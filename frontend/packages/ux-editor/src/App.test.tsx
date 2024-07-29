import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { formLayoutSettingsMock, renderWithProviders } from './testing/mocks';
import { App } from './App';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { typedLocalStorage } from '@studio/components/src/hooks/webStorage';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { AppContextProps } from './AppContext';
import ruleHandlerMock from './testing/ruleHandlerMock';
import { layoutSetsMock } from './testing/layoutSetsMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { user as userMock } from 'app-shared/mocks/mocks';
import { QueryKey } from 'app-shared/types/QueryKey';

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
  queryClient.setQueryData([QueryKey.CurrentUser], [userMock]);
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

  it('should render layoutSetsSelector when component has errors', async () => {
    const mockGetDataModelMetadata = jest.fn().mockImplementation(() => Promise.reject());
    renderApp({ ...mockQueries, getDataModelMetadata: mockGetDataModelMetadata });
    await waitForLoadingToFinish();
    const layoutSetsContainer = screen.getByRole('combobox', {
      name: textMock('left_menu.layout_dropdown_menu_label'),
    });
    expect(layoutSetsContainer).toBeInTheDocument();
  });

  it.each(['layout_sets', 'data_model', 'widget'])(
    'should render errorPage for %s when component has errors',
    async (resource) => {
      let errorQuery;
      if (resource === 'layout_sets') {
        errorQuery = { getLayoutSets: jest.fn().mockImplementation(() => Promise.reject()) };
      }
      if (resource === 'data_model') {
        errorQuery = { getDataModelMetadata: jest.fn().mockImplementation(() => Promise.reject()) };
      }
      if (resource === 'widget') {
        errorQuery = { getWidgetSettings: jest.fn().mockImplementation(() => Promise.reject()) };
      }

      renderApp({ ...mockQueries, ...errorQuery });
      await waitForLoadingToFinish();

      expect(
        screen.getByText(
          textMock('general.fetch_error_title') + ' ' + textMock(`general.${resource}`),
        ),
      ).toBeInTheDocument();
      expect(screen.getByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
    },
  );
});

const waitForLoadingToFinish = async () =>
  await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('ux_editor.loading_page')));
