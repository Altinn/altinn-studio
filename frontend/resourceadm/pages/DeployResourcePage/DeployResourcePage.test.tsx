import React from 'react';
import {
  act,
  render as rtlRender,
  screen,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import { DeployResourcePage, DeployResourcePageProps } from './DeployResourcePage';
import { textMock } from '../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { MemoryRouter } from 'react-router-dom';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { QueryClient, UseMutationResult } from '@tanstack/react-query';
import { usePublishResourceMutation } from 'resourceadm/hooks/mutations';
import { RepoStatus } from 'app-shared/types/RepoStatus';
import { ResourceVersionStatus, Version, Validation } from 'app-shared/types/ResourceAdm';
import userEvent from '@testing-library/user-event';

const mockResourceId: string = 'r1';
const mockSelectedContext: string = 'test';
const mockId: string = 'page-content-deploy';

const mockRepoStatus: RepoStatus = {
  aheadBy: 0,
  behindBy: 0,
  contentStatus: [],
  hasMergeConflict: false,
  repositoryStatus: 'Ok',
};

const mockRepoStatusAhead: RepoStatus = {
  aheadBy: 1,
  behindBy: 0,
  contentStatus: [],
  hasMergeConflict: false,
  repositoryStatus: 'Ok',
};

const mockVersionTT02: Version = { version: null, environment: 'tt02' };
const mockVersionPROD: Version = { version: null, environment: 'prod' };
const mockVersionAT22: Version = { version: null, environment: 'at22' };
const mockVersionAT23: Version = { version: null, environment: 'at23' };

const mockPublishStatus: ResourceVersionStatus = {
  policyVersion: null,
  resourceVersion: '1',
  publishedVersions: [mockVersionTT02, mockVersionPROD, mockVersionAT22, mockVersionAT23],
};

const mockValidatePolicyData1: Validation = { status: 200, errors: [] };
const mockValidatePolicyData2: Validation = {
  status: 400,
  errors: ['rule1.policyerror.missingsubject'],
};
const mockValidatePolicyData3: Validation = {
  status: 404,
  errors: ['policyerror.missingpolicy'],
};

const mockValidateResourceData1: Validation = { status: 200, errors: [] };
const mockValidateResourceData2: Validation = { status: 400, errors: ['resource.title'] };

const mockResourceVersionText: string = '2';
const mockNavigateToPageWithError = jest.fn();
const mockOnSaveVersion = jest.fn();

const getRepoStatus = jest.fn().mockImplementation(() => Promise.resolve({}));
const getResourcePublishStatus = jest.fn().mockImplementation(() => Promise.resolve({}));
const getValidatePolicy = jest.fn().mockImplementation(() => Promise.resolve({}));
const getValidateResource = jest.fn().mockImplementation(() => Promise.resolve({}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    resourceId: mockResourceId,
    selectedContext: mockSelectedContext,
  }),
}));

jest.mock('../../hooks/mutations/usePublishResourceMutation');
const publishResource = jest.fn();
const mockPublishResource = usePublishResourceMutation as jest.MockedFunction<
  typeof usePublishResourceMutation
>;
mockPublishResource.mockReturnValue({
  mutate: publishResource,
} as unknown as UseMutationResult<void, Error, string, unknown>);

const defaultProps: DeployResourcePageProps = {
  navigateToPageWithError: mockNavigateToPageWithError,
  resourceVersionText: mockResourceVersionText,
  onSaveVersion: mockOnSaveVersion,
  id: mockId,
};

describe('DeployResourcePage', () => {
  afterEach(jest.clearAllMocks);

  it('initially displays the spinner when loading data', () => {
    render();

    expect(screen.getByTitle(textMock('resourceadm.deploy_spinner'))).toBeInTheDocument();
  });

  it('fetches repo status data on mount', () => {
    render();
    expect(getRepoStatus).toHaveBeenCalledTimes(1);
  });

  it('fetches resource publish status data on mount', () => {
    render();
    expect(getResourcePublishStatus).toHaveBeenCalledTimes(1);
  });

  it('fetches validates policy on mount', () => {
    render();
    expect(getValidatePolicy).toHaveBeenCalledTimes(1);
  });

  it('fetches validates resource on mount', () => {
    render();
    expect(getValidateResource).toHaveBeenCalledTimes(1);
  });

  it.each(['getResourcePublishStatus', 'getValidatePolicy', 'getValidateResource'])(
    'shows a page error message if an error occured on the %s query',
    async (queryName) => {
      const errorMessage = 'error-message-test';
      render({
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

    const errorMessage = textMock('resourceadm.deploy_status_card_error_resource_page', {
      num: mockValidateResourceData2.errors.length,
    });
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('calls "navigateToPageWithError" when navigating to resource page with errors', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear({
      getValidateResource: () => Promise.resolve(mockValidateResourceData2),
    });

    const linkButton = screen.getByRole('button', {
      name: textMock('resourceadm.about_resource_title'),
    });
    expect(linkButton).toBeInTheDocument();

    await act(() => user.click(linkButton));
    expect(mockNavigateToPageWithError).toHaveBeenCalledTimes(1);
    expect(mockNavigateToPageWithError).toHaveBeenCalledWith('about');
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

  it('renders status card with policy errors when policy validation fails', async () => {
    await resolveAndWaitForSpinnerToDisappear({
      getValidatePolicy: () => Promise.resolve(mockValidatePolicyData2),
    });

    const statusCardTitle = screen.getByText(
      textMock('resourceadm.deploy_status_card_error_title'),
    );
    expect(statusCardTitle).toBeInTheDocument();

    const errorMessage = textMock('resourceadm.deploy_status_card_error_policy_page', {
      num: mockValidatePolicyData2.errors.length,
    });
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('calls "navigateToPageWithError" when navigating to policy page with errors', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear({
      getValidatePolicy: () => Promise.resolve(mockValidatePolicyData2),
    });

    const linkButton = screen.getByRole('button', {
      name: textMock('resourceadm.policy_editor_title'),
    });
    expect(linkButton).toBeInTheDocument();

    await act(() => user.click(linkButton));
    expect(mockNavigateToPageWithError).toHaveBeenCalledTimes(1);
    expect(mockNavigateToPageWithError).toHaveBeenCalledWith('policy');
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

    await act(() => user.type(versionInput, '1'));

    expect(versionInput).toHaveValue(`${mockResourceVersionText}1`);
  });

  it('calls "onSaveVersion" when text field is blurred', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear();

    const versionInput = screen.getByLabelText(textMock('resourceadm.deploy_version_label'));
    await act(() => user.type(versionInput, '1'));
    await act(() => user.tab());

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
      getValidateResource: () => Promise.resolve(mockValidateResourceData2),
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
      getValidatePolicy: () => Promise.resolve(mockValidatePolicyData2),
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

  it('calls "handlePublish" when publishing a resource to tt02', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear();

    const tt02 = textMock('resourceadm.deploy_test_env');

    const tt02Button = screen.getByRole('button', {
      name: textMock('resourceadm.deploy_card_publish', { env: tt02 }),
    });

    expect(tt02Button).not.toBeDisabled();

    await act(() => user.click(tt02Button));
    expect(publishResource).toHaveBeenCalledTimes(1);
  });

  it('calls "handlePublish" when publishing a resource to prod', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear();

    const prod = textMock('resourceadm.deploy_prod_env');

    const prodButton = screen.getByRole('button', {
      name: textMock('resourceadm.deploy_card_publish', { env: prod }),
    });

    expect(prodButton).not.toBeDisabled();

    await act(() => user.click(prodButton));
    expect(publishResource).toHaveBeenCalledTimes(1);
  });
});

const resolveAndWaitForSpinnerToDisappear = async (
  queries: Partial<ServicesContextProps> = {},
  props: Partial<DeployResourcePageProps> = {},
) => {
  getRepoStatus.mockImplementation(() => Promise.resolve(mockRepoStatus));
  getResourcePublishStatus.mockImplementation(() => Promise.resolve(mockPublishStatus));
  getValidatePolicy.mockImplementation(() => Promise.resolve(mockValidatePolicyData1));
  getValidateResource.mockImplementation(() => Promise.resolve(mockValidateResourceData1));

  render(queries, props);
  await waitForElementToBeRemoved(() =>
    screen.queryByTitle(textMock('resourceadm.deploy_spinner')),
  );
};

const render = (
  queries: Partial<ServicesContextProps> = {},
  props: Partial<DeployResourcePageProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getRepoStatus,
    getResourcePublishStatus,
    getValidatePolicy,
    getValidateResource,
    ...queries,
  };
  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={queryClient}>
        <DeployResourcePage {...defaultProps} {...props} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
