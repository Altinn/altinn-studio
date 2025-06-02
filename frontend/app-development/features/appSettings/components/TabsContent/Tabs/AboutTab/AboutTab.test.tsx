import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { AboutTab } from './AboutTab';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from 'app-development/test/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { mockAppConfig } from 'app-development/features/appSettings/mocks/appConfigMock';
import {
  mockRepository1,
  mockRepository2,
} from 'app-development/features/appSettings/mocks/repositoryMock';
import { mockAppMetadata } from 'app-development/test/applicationMetadataMock';
import userEvent from '@testing-library/user-event';
import { useAppConfigMutation } from 'app-development/hooks/mutations';
import type { AppConfig } from 'app-shared/types/AppConfig';
import type { UseMutationResult } from '@tanstack/react-query';
import { formatDateToDateAndTimeString } from 'app-development/utils/dateUtils';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';

jest.mock('app-development/hooks/mutations/useAppConfigMutation');
const updateAppConfigMutation = jest.fn();
const mockUpdateAppConfigMutation = useAppConfigMutation as jest.MockedFunction<
  typeof useAppConfigMutation
>;
mockUpdateAppConfigMutation.mockReturnValue({
  mutate: updateAppConfigMutation,
} as unknown as UseMutationResult<void, Error, AppConfig, unknown>);

describe('AboutTab', () => {
  afterEach(jest.clearAllMocks);

  it('initially displays the spinner when loading data', () => {
    renderAboutTab();
    expect(screen.getByText(textMock('app_settings.loading_content'))).toBeInTheDocument();
  });

  it('fetches appConfig on mount', () => {
    const getAppConfig = jest.fn().mockImplementation(() => Promise.resolve({}));
    renderAboutTab({ getAppConfig });
    expect(getAppConfig).toHaveBeenCalledTimes(1);
  });

  it('fetches repoMetadata on mount', () => {
    const getRepoMetadata = jest.fn().mockImplementation(() => Promise.resolve({}));
    renderAboutTab({ getRepoMetadata });
    expect(getRepoMetadata).toHaveBeenCalledTimes(1);
  });

  it('fetches applicationMetadata on mount', () => {
    const getAppMetadata = jest.fn().mockImplementation(() => Promise.resolve({}));
    renderAboutTab({ getAppMetadata });
    expect(getAppMetadata).toHaveBeenCalledTimes(1);
  });

  it.each(['getAppConfig', 'getRepoMetadata', 'getAppMetadata'])(
    'shows an error message if an error occured on the %s query',
    async (queryName) => {
      const errorMessage = 'error-message-test';

      await resolveAndWaitForSpinnerToDisappear({
        [queryName]: () => Promise.reject({ message: errorMessage }),
      });

      expect(screen.getByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
      expect(screen.getByText(textMock('general.error_message_with_colon'))).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    },
  );

  it('displays the "repo" input as readonly', async () => {
    await resolveAndWaitForSpinnerToDisappear();

    const repoNameInput = screen.getByLabelText(textMock('app_settings.about_tab_repo_label'));
    expect(repoNameInput).toHaveValue(mockAppConfig.repositoryName);
    expect(repoNameInput).toHaveAttribute('readonly');
  });

  it('displays correct value in "name" input field, and updates the value on change', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear();

    const appName = screen.getByLabelText(textMock('app_settings.about_tab_name_label'));
    expect(appName).toHaveValue(mockAppConfig.serviceName);

    const mockNewText: string = 'test';
    await user.type(appName, mockNewText);
    expect(appName).toHaveValue(`${mockAppConfig.serviceName}${mockNewText}`);
  });

  it('displays correct value in "alternative id" input field, and updates the value on change', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear();

    const altId = screen.getByLabelText(textMock('app_settings.about_tab_alt_id_label'));
    expect(altId).toHaveValue(mockAppConfig.serviceId);

    const mockNewText: string = 'test';
    await user.type(altId, mockNewText);
    expect(altId).toHaveValue(`${mockAppConfig.serviceId}${mockNewText}`);
  });

  it('should update app config when saving', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear();

    const altId = screen.getByLabelText(textMock('app_settings.about_tab_alt_id_label'));
    const mockNewText: string = 'test';
    await user.type(altId, mockNewText);
    await user.tab();

    expect(updateAppConfigMutation).toHaveBeenCalledTimes(1);
    expect(updateAppConfigMutation).toHaveBeenCalledWith({
      ...mockAppConfig,
      serviceId: `${mockAppConfig.serviceId}${mockNewText}`,
    });
  });

  it('displays owners full name when it is set', async () => {
    await resolveAndWaitForSpinnerToDisappear();

    expect(screen.getByText(mockRepository1.owner.full_name)).toBeInTheDocument();
    expect(screen.queryByText(mockRepository1.owner.login)).not.toBeInTheDocument();
  });

  it('displays owners login name when full name is not set', async () => {
    const getRepoMetadata = jest.fn().mockImplementation(() => Promise.resolve(mockRepository2));
    await resolveAndWaitForSpinnerToDisappear({ getRepoMetadata });

    expect(screen.queryByText(mockRepository1.owner.full_name)).not.toBeInTheDocument();
    expect(screen.getByText(mockRepository1.owner.login)).toBeInTheDocument();
  });

  it('displays the created date mapped correctly', async () => {
    await resolveAndWaitForSpinnerToDisappear();

    const formatedDateString: string = formatDateToDateAndTimeString(mockRepository1.created_at);
    expect(
      screen.getByText(
        textMock('app_settings.about_tab_created_date', { date: formatedDateString }),
      ),
    ).toBeInTheDocument();
  });

  it('displays the user that created the app correctly', async () => {
    const createdBy: string = 'Mock Mockesen';
    const updatedMockMetadata: ApplicationMetadata = { ...mockAppMetadata, createdBy };
    const getAppMetadata = jest.fn().mockImplementation(() => Promise.resolve(updatedMockMetadata));
    await resolveAndWaitForSpinnerToDisappear({ getAppMetadata });
    expect(screen.getByText(updatedMockMetadata.createdBy)).toBeInTheDocument();
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
  const getAppConfig = jest.fn().mockImplementation(() => Promise.resolve(mockAppConfig));
  const getRepoMetadata = jest.fn().mockImplementation(() => Promise.resolve(mockRepository1));
  const getAppMetadata = jest.fn().mockImplementation(() => Promise.resolve(mockAppMetadata));

  renderAboutTab({
    getAppConfig,
    getRepoMetadata,
    getAppMetadata,
    ...queries,
  });
  await waitForElementToBeRemoved(queryPageSpinner);
};

const queryPageSpinner = () => screen.queryByText(textMock('app_settings.loading_content'));
