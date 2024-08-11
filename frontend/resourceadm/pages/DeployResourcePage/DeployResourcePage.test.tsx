import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import type { DeployResourcePageProps } from './DeployResourcePage';
import { DeployResourcePage } from './DeployResourcePage';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import type { RepoStatus } from 'app-shared/types/RepoStatus';
import type { Validation } from 'app-shared/types/ResourceAdm';
import userEvent from '@testing-library/user-event';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderWithProviders } from '@studio/testing/wrapper';

const mockResourceId: string = 'r1';
const mockOrg: string = 'test';
const mockId: string = 'page-content-deploy';

const mockRepoStatusAhead: RepoStatus = {
  aheadBy: 1,
  behindBy: 0,
  contentStatus: [],
  hasMergeConflict: false,
  repositoryStatus: 'Ok',
};

const mockValidatePolicyData2: Validation = {
  status: 400,
  errors: ['rule1.policyerror.missingsubject'],
};
const mockValidatePolicyData3: Validation = {
  status: 404,
  errors: ['policyerror.missingpolicy'],
};

const mockValidatePolicyData4: Validation = {
  status: 500,
  errors: ['policyerror.missingpolicy'],
};

const mockValidateResourceData2: Validation = { status: 400, errors: ['resource.title'] };

const mockResourceVersionText: string = '2';
const mockNavigateToPageWithError = jest.fn();
const mockOnSaveVersion = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    resourceId: mockResourceId,
    org: mockOrg,
  }),
}));

const defaultProps: DeployResourcePageProps = {
  navigateToPageWithError: mockNavigateToPageWithError,
  resourceVersionText: mockResourceVersionText,
  onSaveVersion: mockOnSaveVersion,
  id: mockId,
};

describe('DeployResourcePage', () => {
  afterEach(jest.clearAllMocks);

  it('initially displays the spinner when loading data', () => {
    renderDeployResourcePage();

    expect(screen.getByTitle(textMock('resourceadm.deploy_spinner'))).toBeInTheDocument();
  });

  it('fetches repo status data on mount', () => {
    renderDeployResourcePage();
    expect(queriesMock.getRepoStatus).toHaveBeenCalledTimes(1);
  });

  it('fetches resource publish status data on mount', () => {
    renderDeployResourcePage();
    expect(queriesMock.getResourcePublishStatus).toHaveBeenCalledTimes(1);
  });

  it('fetches validates policy on mount', () => {
    renderDeployResourcePage();
    expect(queriesMock.getValidatePolicy).toHaveBeenCalledTimes(1);
  });

  it('fetches validates resource on mount', () => {
    renderDeployResourcePage();
    expect(queriesMock.getValidateResource).toHaveBeenCalledTimes(1);
  });

  it.each(['getResourcePublishStatus', 'getValidatePolicy', 'getValidateResource'])(
    'shows a page error message if an error occured on the %s query',
    async (queryName) => {
      const errorMessage = 'error-message-test';
      renderDeployResourcePage({
        [queryName]: () => Promise.reject({ message: errorMessage }),
      });

      await waitForElementToBeRemoved(() =>
        screen.queryByTitle(textMock('resourceadm.deploy_spinner')),
      );

      expect(screen.getByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
      expect(screen.getByText(textMock('general.error_message_with_colon'))).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    },
  );

  it('renders status card with resource errors when resource validation fails', async () => {
    await resolveAndWaitForSpinnerToDisappear({
      getValidateResource: () => Promise.resolve(mockValidateResourceData2),
    });

    const statusCardTitle = screen.getByText(
      textMock('resourceadm.deploy_status_card_error_title'),
    );
    expect(statusCardTitle).toBeInTheDocument();

    const errorMessage = textMock('resourceadm.deploy_status_card_error_resource_page');
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders status card with missing policy error when policy validation fails with missing policy', async () => {
    await resolveAndWaitForSpinnerToDisappear({
      getValidatePolicy: () => Promise.resolve(mockValidatePolicyData3),
    });

    const statusCardTitle = screen.getByText(
      textMock('resourceadm.deploy_status_card_error_title'),
    );
    expect(statusCardTitle).toBeInTheDocument();

    const errorMessage = textMock('resourceadm.deploy_status_card_error_policy_page_missing');
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders status card with default policy error when policy validation fails with server error', async () => {
    await resolveAndWaitForSpinnerToDisappear({
      getValidatePolicy: () => Promise.resolve(mockValidatePolicyData4),
    });

    const statusCardTitle = screen.getByText(
      textMock('resourceadm.deploy_status_card_error_title'),
    );
    expect(statusCardTitle).toBeInTheDocument();

    const errorMessage = textMock('resourceadm.deploy_status_card_error_policy_page_default');
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders status card with policy errors when policy validation fails', async () => {
    await resolveAndWaitForSpinnerToDisappear({
      getValidatePolicy: () => Promise.resolve(mockValidatePolicyData2),
    });

    const statusCardTitle = screen.getByText(
      textMock('resourceadm.deploy_status_card_error_title'),
    );
    expect(statusCardTitle).toBeInTheDocument();

    const errorMessage = textMock('resourceadm.deploy_status_card_error_policy_page');
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders status card with repo not in sync errors when repo is behind or ahead of master', async () => {
    await resolveAndWaitForSpinnerToDisappear({
      getRepoStatus: () => Promise.resolve(mockRepoStatusAhead),
    });

    const statusCardTitle = screen.getByText(
      textMock('resourceadm.deploy_status_card_error_title'),
    );
    expect(statusCardTitle).toBeInTheDocument();

    const errorMessage = textMock('resourceadm.deploy_status_card_error_repo');
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders status card errors when repo status could not be found', async () => {
    await resolveAndWaitForSpinnerToDisappear({
      getRepoStatus: () => Promise.reject(),
    });

    const statusCardTitle = screen.getByText(
      textMock('resourceadm.deploy_status_card_error_title'),
    );
    expect(statusCardTitle).toBeInTheDocument();

    const errorMessage = textMock('resourceadm.deploy_status_card_error_repo');
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders status card with missing version number error when version number is missing', async () => {
    await resolveAndWaitForSpinnerToDisappear({}, { resourceVersionText: '' });

    const statusCardTitle = screen.getByText(
      textMock('resourceadm.deploy_status_card_error_title'),
    );
    expect(statusCardTitle).toBeInTheDocument();

    const errorMessage = textMock('resourceadm.deploy_status_card_error_version');
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders status card with no errors when the resource is ready for deploy', async () => {
    await resolveAndWaitForSpinnerToDisappear();

    const statusCardTitleError = screen.queryByText(
      textMock('resourceadm.deploy_status_card_error_title'),
    );
    expect(statusCardTitleError).not.toBeInTheDocument();

    const statusCardTitleSuccess = screen.getByText(
      textMock('resourceadm.deploy_status_card_success'),
    );
    expect(statusCardTitleSuccess).toBeInTheDocument();
  });

  it('updates the version text when typing in the textfield', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear();

    const versionInput = screen.getByLabelText(textMock('resourceadm.deploy_version_label'));
    expect(versionInput).toHaveValue(mockResourceVersionText);

    await user.type(versionInput, '1');

    expect(versionInput).toHaveValue(`${mockResourceVersionText}1`);
  });

  it('calls "onSaveVersion" when text field is blurred', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear();

    const versionInput = screen.getByLabelText(textMock('resourceadm.deploy_version_label'));
    await user.type(versionInput, '1');
    await user.tab();

    expect(mockOnSaveVersion).toHaveBeenCalledTimes(1);
    expect(mockOnSaveVersion).toHaveBeenCalledWith(`${mockResourceVersionText}1`);
  });

  it('disables the deploy buttons when there is no version text', async () => {
    await resolveAndWaitForSpinnerToDisappear({}, { resourceVersionText: '' });

    const tt02 = textMock('resourceadm.deploy_test_env');
    const prod = textMock('resourceadm.deploy_prod_env');

    const tt02Button = screen.getByRole('button', {
      name: textMock('resourceadm.deploy_card_publish', { env: tt02 }),
    });
    const prodButton = screen.getByRole('button', {
      name: textMock('resourceadm.deploy_card_publish', { env: prod }),
    });

    expect(tt02Button).toBeDisabled();
    expect(prodButton).toBeDisabled();
  });

  it('disables the deploy buttons when there is validate resource error', async () => {
    await resolveAndWaitForSpinnerToDisappear({
      getValidateResource: () => Promise.resolve<Validation>(mockValidateResourceData2),
    });

    const tt02 = textMock('resourceadm.deploy_test_env');
    const prod = textMock('resourceadm.deploy_prod_env');

    const tt02Button = screen.getByRole('button', {
      name: textMock('resourceadm.deploy_card_publish', { env: tt02 }),
    });
    const prodButton = screen.getByRole('button', {
      name: textMock('resourceadm.deploy_card_publish', { env: prod }),
    });

    expect(tt02Button).toBeDisabled();
    expect(prodButton).toBeDisabled();
  });

  it('disables the deploy buttons when there is validate policy error', async () => {
    await resolveAndWaitForSpinnerToDisappear({
      getValidatePolicy: () => Promise.resolve<Validation>(mockValidatePolicyData2),
    });
    const tt02 = textMock('resourceadm.deploy_test_env');
    const prod = textMock('resourceadm.deploy_prod_env');

    const tt02Button = screen.getByRole('button', {
      name: textMock('resourceadm.deploy_card_publish', { env: tt02 }),
    });
    const prodButton = screen.getByRole('button', {
      name: textMock('resourceadm.deploy_card_publish', { env: prod }),
    });

    expect(tt02Button).toBeDisabled();
    expect(prodButton).toBeDisabled();
  });

  it('disables the deploy buttons when there is a local repo not in sync error', async () => {
    await resolveAndWaitForSpinnerToDisappear({
      getRepoStatus: () => Promise.resolve(mockRepoStatusAhead),
    });

    const tt02 = textMock('resourceadm.deploy_test_env');
    const prod = textMock('resourceadm.deploy_prod_env');

    const tt02Button = screen.getByRole('button', {
      name: textMock('resourceadm.deploy_card_publish', { env: tt02 }),
    });
    const prodButton = screen.getByRole('button', {
      name: textMock('resourceadm.deploy_card_publish', { env: prod }),
    });

    expect(tt02Button).toBeDisabled();
    expect(prodButton).toBeDisabled();
  });
});

const resolveAndWaitForSpinnerToDisappear = async (
  queries: Partial<ServicesContextProps> = {},
  props: Partial<DeployResourcePageProps> = {},
) => {
  renderDeployResourcePage(
    {
      ...queries,
    },
    props,
  );
  await waitForElementToBeRemoved(() =>
    screen.queryByTitle(textMock('resourceadm.deploy_spinner')),
  );
};

const renderDeployResourcePage = (
  queries: Partial<ServicesContextProps> = {},
  props: Partial<DeployResourcePageProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  return renderWithProviders(<DeployResourcePage {...defaultProps} {...props} />, {
    queries,
    queryClient,
  });
};
