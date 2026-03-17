import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { AboutTab } from './AboutTab';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from 'app-development/test/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { mockAppMetadata } from 'app-development/test/applicationMetadataMock';
import { useAppMetadataMutation } from 'app-development/hooks/mutations/useAppMetadataMutation';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import type { UseMutationResult } from '@tanstack/react-query';

jest.mock('app-development/hooks/mutations/useAppMetadataMutation');
const updateAppMetadataMutation = jest.fn();
const mockUpdateAppMetadataMutation = useAppMetadataMutation as jest.MockedFunction<
  typeof useAppMetadataMutation
>;
mockUpdateAppMetadataMutation.mockReturnValue({
  mutate: updateAppMetadataMutation,
} as unknown as UseMutationResult<void, Error, ApplicationMetadata, unknown>);

describe('AboutTab', () => {
  afterEach(jest.clearAllMocks);

  it('initially displays the spinner when loading data', () => {
    renderAboutTab();
    expect(screen.getByText(textMock('app_settings.loading_content'))).toBeInTheDocument();
  });

  it('fetches applicationMetadata on mount', () => {
    const getAppMetadata = jest.fn().mockImplementation(() => Promise.resolve({}));
    renderAboutTab({ getAppMetadata });
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

  it('displays the "repo" input as readonly', async () => {
    await resolveAndWaitForSpinnerToDisappear();

    const repoNameInput = screen.getByLabelText(textMock('app_settings.about_tab_repo_label'));
    expect(repoNameInput).toHaveValue(mockAppMetadata.id);
    expect(repoNameInput).toHaveAttribute('readonly');
  });

  it('renders AppConfigForm when data is loaded', async () => {
    await resolveAndWaitForSpinnerToDisappear();

    const matches = screen.getAllByText(
      textMock('app_settings.about_tab_contact_point_dialog_add_title'),
    );
    expect(matches.length).toBeGreaterThan(0);
  });
});

const renderAboutTab = (queries: Partial<ServicesContextProps> = {}) => {
  const queryClient = createQueryClientMock();
  const allQueries = {
    ...queriesMock,
    ...queries,
  };
  return renderWithProviders(allQueries, queryClient)(<AboutTab />);
};

const resolveAndWaitForSpinnerToDisappear = async (queries: Partial<ServicesContextProps> = {}) => {
  const getAppMetadata = jest.fn().mockImplementation(() => Promise.resolve(mockAppMetadata));

  renderAboutTab({
    getAppMetadata,
    ...queries,
  });
  await waitForElementToBeRemoved(queryPageSpinner);
};

const queryPageSpinner = () => screen.queryByText(textMock('app_settings.loading_content'));
