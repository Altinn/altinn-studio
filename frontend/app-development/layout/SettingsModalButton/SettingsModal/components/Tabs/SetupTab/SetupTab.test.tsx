import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { SetupTab } from './SetupTab';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { mockAppMetadata } from '../../../mocks/applicationMetadataMock';
import { app, org } from '@studio/testing/testids';
import { renderWithProviders } from '../../../../../../test/mocks';

const getAppMetadata = jest.fn().mockImplementation(() => Promise.resolve({}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => {
    return { org, app };
  },
}));

describe('SetupTab Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initially displays the spinner when loading data', () => {
    render();

    expect(screen.getByTitle(textMock('settings_modal.loading_content'))).toBeInTheDocument();
  });

  it('fetches appMetadata on mount', () => {
    render();
    expect(getAppMetadata).toHaveBeenCalledTimes(1);
  });

  it('shows an error message if an error occured on the "getAppMetadata" query', async () => {
    const errorMessage = 'error-message-test';
    render({
      getAppMetadata: () => Promise.reject({ message: errorMessage }),
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content')),
    );

    expect(screen.getByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
    expect(screen.getByText(textMock('general.error_message_with_colon'))).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('displays the child component when there are no errors', async () => {
    getAppMetadata.mockImplementation(() => Promise.resolve(mockAppMetadata));
    render();

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content')),
    );

    const componentFromChild = screen.getByLabelText(
      textMock('settings_modal.setup_tab_switch_autoDeleteOnProcessEnd'),
    );

    expect(componentFromChild).toBeInTheDocument();
  });
});

const render = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries: ServicesContextProps = {
    getAppMetadata,
    ...queries,
  };
  return renderWithProviders(<SetupTab />, { queries: allQueries, queryClient });
};
