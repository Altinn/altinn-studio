import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { AccessControlTab } from './AccessControlTab';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import { mockAppMetadata } from '../../../mocks/applicationMetadataMock';
import userEvent from '@testing-library/user-event';
import { app, org } from '@studio/testing/testids';
import { renderWithProviders } from '../../../../../../test/mocks';

const getAppMetadata = jest.fn().mockImplementation(() => Promise.resolve({}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => {
    return { org, app };
  },
}));

describe('AccessControlTab', () => {
  afterEach(jest.clearAllMocks);

  it('render header for selectAllowedPartyTypes', async () => {
    await resolveAndWaitForSpinnerToDisappear();
    expect(
      screen.getByText(textMock('settings_modal.access_control_tab_heading')),
    ).toBeInTheDocument();
  });

  it('initially displays the spinner when loading data', () => {
    render();

    expect(screen.getByTitle(textMock('settings_modal.loading_content'))).toBeInTheDocument();
  });

  it('fetches appMetadata on mount', () => {
    render();
    expect(getAppMetadata).toHaveBeenCalledTimes(1);
  });

  it('shows an error message if an error occured on the getAppMetadata query', async () => {
    const errorMessage = 'error-message-test';
    render({ getAppMetadata: () => Promise.reject({ message: errorMessage }) });

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content')),
    );

    expect(screen.getByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
    expect(screen.getByText(textMock('general.error_message_with_colon'))).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should render the text of the button for help text correctly', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear();
    const helpButton = screen.getByRole('button', {
      name: textMock('settings_modal.access_control_tab_help_text_title'),
    });
    await user.click(helpButton);
    screen.getByText(textMock('settings_modal.access_control_tab_help_text_heading'));
  });

  it('renders the documentation link with the correct text', async () => {
    await resolveAndWaitForSpinnerToDisappear();
    screen.getByText(
      textMock('settings_modal.access_control_tab_option_access_control_docs_link_text'),
    );
  });
});

const resolveAndWaitForSpinnerToDisappear = async (queries: Partial<ServicesContextProps> = {}) => {
  getAppMetadata.mockImplementation(() => Promise.resolve(mockAppMetadata));
  render(queries);
  await waitForElementToBeRemoved(() =>
    screen.queryByTitle(textMock('settings_modal.loading_content')),
  );
};

const render = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries: ServicesContextProps = {
    getAppMetadata,
    ...queries,
  };

  return renderWithProviders(<AccessControlTab />, { queries: allQueries, queryClient });
};
