import React from 'react';
import { DataModelling } from './DataModelling';
import {
  act,
  render as rtlRender,
  screen,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import { textMock } from '../../../testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { jsonMetadata1Mock } from '../../../packages/schema-editor/test/mocks/metadataMocks';
import type { QueryClient } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';

// workaround for https://jestjs.io/docs/26.x/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

const org = 'org';
const app = 'app';
const user = userEvent.setup();

const render = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  return rtlRender(
    <ServicesContextProvider {...allQueries} client={queryClient}>
      <DataModelling />
    </ServicesContextProvider>,
  );
};

describe('DataModelling', () => {
  afterEach(jest.clearAllMocks);

  it('fetches models on mount', () => {
    render();
    expect(queriesMock.getDatamodelsJson).toHaveBeenCalledTimes(1);
    expect(queriesMock.getDatamodelsXsd).toHaveBeenCalledTimes(1);
  });

  it('shows start dialog when no models are present and intro page is closed', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.DatamodelsJson, org, app], []);
    queryClient.setQueryData([QueryKey.DatamodelsXsd, org, app], []);
    render({}, queryClient);
    const dialogHeader = screen.getByRole('heading', {
      name: textMock('app_data_modelling.landing_dialog_header'),
    });
    expect(dialogHeader).toBeInTheDocument();
  });

  it('does not show start dialog when the models have not been loaded yet', () => {
    render();
    expect(screen.getByTitle(textMock('general.loading'))).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: textMock('app_data_modelling.landing_dialog_header') }),
    ).not.toBeInTheDocument();
  });

  it('does not show start dialog when there are models present', async () => {
    const getDatamodelsJson = jest
      .fn()
      .mockImplementation(() => Promise.resolve([jsonMetadata1Mock]));
    render({ getDatamodelsJson });
    await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));
    expect(
      screen.queryByRole('heading', { name: textMock('app_data_modelling.landing_dialog_header') }),
    ).not.toBeInTheDocument();
  });

  it('shows schema errors panel first when "generate model" button is clicked and returns errors', async () => {
    const queryClient = createQueryClientMock();
    const generateModels = jest
      .fn()
      .mockImplementation(() =>
        Promise.reject(
          createApiErrorMock(400, 'DM_01', [
            'custom error message',
            'another custom error message',
          ]),
        ),
      );
    queryClient.setQueryData([QueryKey.DatamodelsJson, org, app], [jsonMetadata1Mock]);
    queryClient.setQueryData([QueryKey.DatamodelsXsd, org, app], []);
    render({ generateModels }, queryClient);
    const errorsPanel = screen.queryByText(textMock('api_errors.DM_01'));
    expect(errorsPanel).not.toBeInTheDocument();

    const generateModelButton = screen.getByRole('button', {
      name: textMock('schema_editor.generate_model_files'),
    });
    await act(() => user.click(generateModelButton));
    const errorsPanelWithErrors = screen.getByText(textMock('api_errors.DM_01'));
    expect(errorsPanelWithErrors).toBeInTheDocument();
  });

  it('closes schemaErrorsPanel when "close" button is clicked', async () => {
    const queryClient = createQueryClientMock();
    const generateModels = jest
      .fn()
      .mockImplementation(() =>
        Promise.reject(
          createApiErrorMock(400, 'DM_01', [
            'custom error message',
            'another custom error message',
          ]),
        ),
      );
    queryClient.setQueryData([QueryKey.DatamodelsJson, org, app], [jsonMetadata1Mock]);
    queryClient.setQueryData([QueryKey.DatamodelsXsd, org, app], []);
    render({ generateModels }, queryClient);

    const generateModelButton = screen.getByRole('button', {
      name: textMock('schema_editor.generate_model_files'),
    });
    await act(() => user.click(generateModelButton));
    const errorsPanelWithErrors = screen.getByText(textMock('api_errors.DM_01'));
    expect(errorsPanelWithErrors).toBeInTheDocument();
    const closeSchemaErrorsPanelButton = screen.getByRole('button', {
      name: textMock('general.close'),
    });
    await act(() => user.click(closeSchemaErrorsPanelButton));
    const errorsPanel = screen.queryByText(textMock('api_errors.DM_01'));
    expect(errorsPanel).not.toBeInTheDocument();
  });

  it.each(['getDatamodelsJson', 'getDatamodelsXsd'])(
    'shows an error message if an error occured on the %s query',
    async (queryName) => {
      const errorMessage = 'error-message-test';
      render({
        [queryName]: () => Promise.reject({ message: errorMessage }),
      });
      await waitForElementToBeRemoved(() => screen.queryByTitle(textMock('general.loading')));
      expect(screen.getByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
      expect(screen.getByText(textMock('general.error_message_with_colon'))).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    },
  );

  it('Shows a spinner when loading', () => {
    render();
    expect(screen.getByTitle(textMock('general.loading'))).toBeInTheDocument();
  });

  it.each([QueryKey.DatamodelsJson, QueryKey.DatamodelsXsd])(
    'Shows a spinner when only the "%s" query is loading',
    (queryKey) => {
      const queryClient = createQueryClientMock();
      queryClient.setQueryData([queryKey, org, app], []);
      render({}, queryClient);
      expect(screen.getByTitle(textMock('general.loading'))).toBeInTheDocument();
    },
  );
});
