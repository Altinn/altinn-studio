import React from 'react';
import {
  render as rtlRender,
  screen,
  act,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import { SettingsModalButton } from './SettingsModalButton';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { MemoryRouter } from 'react-router-dom';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { QueryClient } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../testing/mocks/i18nMock';
import { mockAppConfig } from './SettingsModal/mocks/appConfigMock';
import { mockPolicy } from './SettingsModal/mocks/policyMock';
import { mockRepository1 } from './SettingsModal/mocks/repositoryMock';
import { Commit, CommitAuthor } from 'app-shared/types/Commit';

const mockApp: string = 'app';
const mockOrg: string = 'org';

const mockCommitAuthor: CommitAuthor = {
  email: '',
  name: 'Mock Mockesen',
  when: '',
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

const resolveMocks = () => {
  getAppPolicy.mockImplementation(() => Promise.resolve(mockPolicy));
  getAppConfig.mockImplementation(() => Promise.resolve(mockAppConfig));
  getRepoMetadata.mockImplementation(() => Promise.resolve(mockRepository1));
  getRepoInitialCommit.mockImplementation(() => Promise.resolve(mockInitialCommit));
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    app: mockApp,
    org: mockOrg,
  }),
}));

describe('SettingsModalButton', () => {
  const user = userEvent.setup();
  afterEach(jest.clearAllMocks);

  it('fetches policy on mount', () => {
    render();
    expect(getAppPolicy).toHaveBeenCalledTimes(1);
  });

  it('fetches appConfig on mount', () => {
    render();
    expect(getAppConfig).toHaveBeenCalledTimes(1);
  });

  it('fetches repoMetaData on mount', () => {
    render();
    expect(getRepoMetadata).toHaveBeenCalledTimes(1);
  });

  it('fetches commit data on mount', () => {
    render();
    expect(getRepoInitialCommit).toHaveBeenCalledTimes(1);
  });

  it('initially displays the spinner when loading data', () => {
    render();

    expect(screen.getByTitle(textMock('settings_modal.loading_content'))).toBeInTheDocument();
  });

  it.each(['getAppPolicy', 'getAppConfig', 'getRepoMetadata', 'getRepoInitialCommit'])(
    'shows an error message if an error occured on the %s query',
    async (queryName) => {
      const errorMessage = 'error-message-test';
      render({
        [queryName]: () => Promise.reject({ message: errorMessage }),
      });

      await waitForElementToBeRemoved(() =>
        screen.queryByTitle(textMock('settings_modal.loading_content'))
      );

      expect(screen.getByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
      expect(screen.getByText(textMock('general.error_message_with_colon'))).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    }
  );

  it('opens the modal when the button is clicked', async () => {
    resolveMocks();
    render();

    expect(
      screen.queryByRole('heading', { name: textMock('settings_modal.heading'), level: 1 })
    ).not.toBeInTheDocument();

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content'))
    );

    const openButton = screen.getByRole('button', { name: textMock('settings_modal.open_button') });
    expect(openButton).toBeInTheDocument();
    await act(() => user.click(openButton));

    expect(
      screen.getByRole('heading', { name: textMock('settings_modal.heading'), level: 1 })
    ).toBeInTheDocument();
  });

  it('closes the modal on click', async () => {
    resolveMocks();
    render();

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('settings_modal.loading_content'))
    );

    const openButton = screen.getByRole('button', { name: textMock('settings_modal.open_button') });
    await act(() => user.click(openButton));

    expect(
      screen.getByRole('heading', { name: textMock('settings_modal.heading'), level: 1 })
    ).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: textMock('modal.close_icon') });
    await act(() => user.click(closeButton));

    expect(
      screen.queryByRole('heading', { name: textMock('settings_modal.heading'), level: 1 })
    ).not.toBeInTheDocument();
  });
});

const render = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock()
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    getAppPolicy,
    getAppConfig,
    getRepoMetadata,
    getRepoInitialCommit,
    ...queries,
  };
  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={queryClient}>
        <SettingsModalButton />
      </ServicesContextProvider>
    </MemoryRouter>
  );
};
