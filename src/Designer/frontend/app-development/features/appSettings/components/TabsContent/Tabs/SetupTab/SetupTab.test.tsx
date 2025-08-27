import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { SetupTab } from './SetupTab';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithProviders } from '../../../../../../test/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { mockAppMetadata } from '../../../../../../test/applicationMetadataMock';

describe('SetupTab', () => {
  afterEach(jest.clearAllMocks);

  it('initially displays the spinner when loading data', () => {
    renderSetupTab();
    expect(screen.getByText(textMock('app_settings.loading_content'))).toBeInTheDocument();
  });

  it('fetches appMetadata on mount', async () => {
    const getAppMetadata = jest.fn().mockImplementation(() => Promise.resolve({}));
    renderSetupTab({ getAppMetadata });
    expect(getAppMetadata).toHaveBeenCalledTimes(1);
  });

  it('shows an error message if an error occured on the "getAppMetadata" query', async () => {
    const errorMessage = 'error-message-test';
    const getAppMetadata = jest
      .fn()
      .mockImplementation(() => Promise.reject({ message: errorMessage }));

    renderSetupTab({ getAppMetadata });
    await waitForSpinnerToBeRemoved();

    expect(screen.getByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
    expect(screen.getByText(textMock('general.error_message_with_colon'))).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('displays the child component when there are no errors', async () => {
    const getAppMetadata = jest.fn().mockImplementation(() => Promise.resolve(mockAppMetadata));
    renderSetupTab({ getAppMetadata });
    await waitForSpinnerToBeRemoved();

    const componentFromChild = screen.getByLabelText(
      textMock('app_settings.setup_tab_switch_autoDeleteOnProcessEnd'),
    );

    expect(componentFromChild).toBeInTheDocument();
  });
});

const renderSetupTab = (queries: Partial<ServicesContextProps> = {}) => {
  const queryClient = createQueryClientMock();
  const allQueries = {
    ...queriesMock,
    ...queries,
  };
  return renderWithProviders(allQueries, queryClient)(<SetupTab />);
};

const waitForSpinnerToBeRemoved = async () => {
  await waitForElementToBeRemoved(() =>
    screen.queryByText(textMock('app_settings.loading_content')),
  );
};
