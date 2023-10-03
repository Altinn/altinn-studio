import React from 'react';
import {
  render as rtlRender,
  screen,
  act,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal, SettingsModalProps } from './SettingsModal';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryClient, UseMutationResult } from '@tanstack/react-query';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { AppConfig } from 'app-shared/types/AppConfig';
import { useAppConfigMutation } from 'app-development/hooks/mutations';
import { mockPolicy } from './mocks/policyMock';
import { mockAppConfig } from './mocks/appConfigMock';
import { mockRepository1 } from './mocks/repositoryMock';
import { mockAppMetadata } from './mocks/applicationMetadataMock';
import { Commit, CommitAuthor } from 'app-shared/types/Commit';
import { MemoryRouter } from 'react-router-dom';

const mockApp: string = 'app';
const mockOrg: string = 'org';

const mockCommitAuthor: CommitAuthor = {
  email: '',
  name: 'Mock Mockesen',
  when: new Date(2023, 9, 22),
};

const mockInitialCommit: Commit = {
  message: '',
  author: mockCommitAuthor,
  comitter: mockCommitAuthor,
  sha: '',
  messageShort: '',
  encoding: '',
};

const getAppPolicy = jest.fn().mockImplementation(() => Promise.resolve({}));
const getAppConfig = jest.fn().mockImplementation(() => Promise.resolve({}));
const getRepoMetadata = jest.fn().mockImplementation(() => Promise.resolve({}));
const getRepoInitialCommit = jest.fn().mockImplementation(() => Promise.resolve({}));
const getAppMetadata = jest.fn().mockImplementation(() => Promise.resolve({}));

const resolveMocks = () => {
  getAppPolicy.mockImplementation(() => Promise.resolve(mockPolicy));
  getAppConfig.mockImplementation(() => Promise.resolve(mockAppConfig));
  getRepoMetadata.mockImplementation(() => Promise.resolve(mockRepository1));
  getRepoInitialCommit.mockImplementation(() => Promise.resolve(mockInitialCommit));
  getAppMetadata.mockImplementation(() => Promise.resolve(mockAppMetadata));
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    app: mockApp,
    org: mockOrg,
  }),
}));

jest.mock('../../../hooks/mutations/useAppConfigMutation');
const updateAppConfigMutation = jest.fn();
const mockUpdateAppConfigMutation = useAppConfigMutation as jest.MockedFunction<
  typeof useAppConfigMutation
>;
mockUpdateAppConfigMutation.mockReturnValue({
  mutate: updateAppConfigMutation,
} as unknown as UseMutationResult<void, unknown, AppConfig, unknown>);

describe('SettingsModal', () => {
  const user = userEvent.setup();
  afterEach(jest.clearAllMocks);

  const mockOnClose = jest.fn();

  const defaultProps: SettingsModalProps = {
    isOpen: true,
    onClose: mockOnClose,
    org: mockOrg,
    app: mockApp,
  };

  it('fetches policy on mount', () => {
    render(defaultProps);
    expect(getAppPolicy).toHaveBeenCalledTimes(1);
  });

  it('fetches appConfig on mount', () => {
    render(defaultProps);
    expect(getAppConfig).toHaveBeenCalledTimes(1);
  });

  it('fetches repoMetaData on mount', () => {
    render(defaultProps);
    expect(getRepoMetadata).toHaveBeenCalledTimes(1);
  });

  it('fetches commit data on mount', () => {
    render(defaultProps);
    expect(getRepoInitialCommit).toHaveBeenCalledTimes(1);
  });

  it('fetches appMetadata on mount', () => {
    render(defaultProps);
    expect(getAppMetadata).toHaveBeenCalledTimes(1);
  });

  it('initially displays the spinner when loading data', () => {
    render(defaultProps);

    expect(screen.getByTitle(textMock('settings_modal.loading_content'))).toBeInTheDocument();
  });

  it.each([
    'getAppPolicy',
    'getAppConfig',
    'getAppMetadata',
    'getRepoMetadata',
    'getRepoInitialCommit',
  ])('shows an error message if an error occured on the %s query', async (queryName) => {
    const errorMessage = 'error-message-test';
    render(defaultProps, {
      [queryName]: () => Promise.reject({ message: errorMessage }),
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content')),
    );

    expect(screen.getByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
    expect(screen.getByText(textMock('general.error_message_with_colon'))).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('closes the modal when the close button is clicked', async () => {
    render(defaultProps);

    const closeButton = screen.getByRole('button', { name: textMock('modal.close_icon') });
    await act(() => user.click(closeButton));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('displays left navigation bar when promises resolves', async () => {
    await resolveAndWaitForSpinnerToRemove();

    expect(
      screen.getByRole('button', { name: textMock('settings_modal.left_nav_tab_about') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('settings_modal.left_nav_tab_policy') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('settings_modal.left_nav_tab_localChanges') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('settings_modal.left_nav_tab_accessControl') }),
    ).toBeInTheDocument();
  });

  it('displays the about tab, and not the other tabs, when promises resolves first time', async () => {
    await resolveAndWaitForSpinnerToRemove();

    expect(screen.getByText(textMock('settings_modal.about_tab_heading'))).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        name: textMock('settings_modal.policy_tab_heading'),
        level: 2,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        name: textMock('settings_modal.access_control_tab_heading'),
        level: 2,
      }),
    ).not.toBeInTheDocument();
  });

  it('changes the tab from "about" to "policy" when policy tab is clicked', async () => {
    await resolveAndWaitForSpinnerToRemove();

    expect(
      screen.queryByRole('heading', {
        name: textMock('settings_modal.policy_tab_heading'),
        level: 2,
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(textMock('settings_modal.about_tab_heading'))).toBeInTheDocument();

    const policyTab = screen.getByRole('button', {
      name: textMock('settings_modal.left_nav_tab_policy'),
    });
    await act(() => user.click(policyTab));

    expect(
      screen.getByRole('heading', {
        name: textMock('settings_modal.policy_tab_heading'),
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(textMock('settings_modal.about_tab_heading')),
    ).not.toBeInTheDocument();
  });

  it('changes the tab from "policy" to "about" when about tab is clicked', async () => {
    await resolveAndWaitForSpinnerToRemove();

    const policyTab = screen.getByRole('button', {
      name: textMock('settings_modal.left_nav_tab_policy'),
    });
    await act(() => user.click(policyTab));

    const aboutTab = screen.getByRole('button', {
      name: textMock('settings_modal.left_nav_tab_about'),
    });
    await act(() => user.click(aboutTab));

    expect(
      screen.queryByRole('heading', {
        name: textMock('settings_modal.policy_tab_heading'),
        level: 2,
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(textMock('settings_modal.about_tab_heading'))).toBeInTheDocument();
  });

  it('changes the tab from "about" to "localChanges" when local changes tab is clicked', async () => {
    await resolveAndWaitForSpinnerToRemove();

    expect(
      screen.queryByRole('heading', {
        name: textMock('settings_modal.local_changes_tab_heading'),
        level: 2,
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(textMock('settings_modal.about_tab_heading'))).toBeInTheDocument();

    const localChangesTab = screen.getByRole('button', {
      name: textMock('settings_modal.left_nav_tab_localChanges'),
    });
    await act(() => user.click(localChangesTab));

    expect(
      screen.getByRole('heading', {
        name: textMock('settings_modal.local_changes_tab_heading'),
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(textMock('settings_modal.about_tab_heading')),
    ).not.toBeInTheDocument();
  });

  it('changes the tab from "about" to "accessControl" when access control tab is clicked', async () => {
    await resolveAndWaitForSpinnerToRemove();

    expect(
      screen.queryByRole('heading', {
        name: textMock('settings_modal.access_control_tab_heading'),
        level: 2,
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(textMock('settings_modal.about_tab_heading'))).toBeInTheDocument();

    const accessControlTab = screen.getByRole('button', {
      name: textMock('settings_modal.left_nav_tab_accessControl'),
    });
    await act(() => user.click(accessControlTab));

    expect(
      screen.getByRole('heading', {
        name: textMock('settings_modal.access_control_tab_heading'),
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(textMock('settings_modal.about_tab_heading')),
    ).not.toBeInTheDocument();
  });

  /**
   * Resolves the mocks, renders the component and waits for the spinner
   * to be removed from the screen
   */
  const resolveAndWaitForSpinnerToRemove = async () => {
    resolveMocks();
    render(defaultProps);

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content')),
    );
  };
});

const render = (
  props: SettingsModalProps,
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getAppPolicy,
    getAppConfig,
    getRepoMetadata,
    getRepoInitialCommit,
    getAppMetadata,
    ...queries,
  };
  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={queryClient}>
        <SettingsModal {...props} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
