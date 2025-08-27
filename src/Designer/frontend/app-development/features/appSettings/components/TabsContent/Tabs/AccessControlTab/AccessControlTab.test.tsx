import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { AccessControlTab } from './AccessControlTab';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from '../../../../../../test/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { mockAppMetadata } from '../../../../../../test/applicationMetadataMock';
import { altinnDocsUrl } from 'app-shared/ext-urls';

describe('AccessControlTab', () => {
  afterEach(jest.clearAllMocks);

  it('initially displays the spinner when loading data', () => {
    renderAccessControlTab();
    expect(screen.getByText(textMock('app_settings.loading_content'))).toBeInTheDocument();
  });

  it('fetches getAppMetadata on mount', () => {
    const getAppMetadata = jest.fn().mockImplementation(() => Promise.resolve({}));
    renderAccessControlTab({ getAppMetadata });
    expect(getAppMetadata).toHaveBeenCalledTimes(1);
  });

  it('shows an error message if an error occurred on the getAppMetadata query', async () => {
    const errorMessage = 'error-message-test';

    await resolveAndWaitForSpinnerToDisappear({
      getAppMetadata: () => Promise.reject({ message: errorMessage }),
    });

    expect(screen.getByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
    expect(screen.getByText(textMock('general.error_message_with_colon'))).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('displays SelectAllowedPartyTypes  when appMetadata is successfully fetched', async () => {
    await resolveAndWaitForSpinnerToDisappear({
      getAppMetadata: () => Promise.resolve(mockAppMetadata),
    });

    expect(
      screen.getByText(textMock('app_settings.access_control_tab_checkbox_legend_label')),
    ).toBeInTheDocument();
  });

  it('displays documentation when appMetadata is successfully fetched', async () => {
    await resolveAndWaitForSpinnerToDisappear({
      getAppMetadata: () => Promise.resolve(mockAppMetadata),
    });

    const link = screen.getByRole('link', {
      name: textMock('app_settings.access_control_tab_option_access_control_docs_link'),
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      'href',
      altinnDocsUrl({ relativeUrl: 'altinn-studio/reference/logic/instantiation' }),
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

const renderAccessControlTab = (queries: Partial<ServicesContextProps> = {}) => {
  const queryClient = createQueryClientMock();
  const allQueries = {
    ...queriesMock,
    ...queries,
  };
  return renderWithProviders(allQueries, queryClient)(<AccessControlTab />);
};

const resolveAndWaitForSpinnerToDisappear = async (queries: Partial<ServicesContextProps> = {}) => {
  const getAppMetadata = jest.fn().mockImplementation(() => Promise.resolve(mockAppMetadata));

  renderAccessControlTab({
    getAppMetadata,
    ...queries,
  });
  await waitForElementToBeRemoved(queryPageSpinner);
};

const queryPageSpinner = () => screen.queryByText(textMock('app_settings.loading_content'));
