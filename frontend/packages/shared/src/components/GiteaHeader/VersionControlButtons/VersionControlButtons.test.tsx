import React from 'react';
import { act, render as renderRtl, screen, waitFor } from '@testing-library/react';
import type { IVersionControlButtonsProps } from './VersionControlButtons';
import { VersionControlButtons } from './VersionControlButtons';
import { setWindowLocationForTests } from '../../../../../../testing/testUtils';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { RepoStatus } from 'app-shared/types/RepoStatus';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import * as testids from '../../../../../../testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { repoStatus } from 'app-shared/mocks/mocks';

const user = userEvent.setup();
const org = 'test-org';
const app = 'test-app';

setWindowLocationForTests(org, app);

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
  useParams: () => ({
    org: org,
    app: app,
  }),
}));

/**
 * This part is probably not ideal. A more scaleable way to mock these calls should be done in a more sentral place
 * for instance the `renderWithProviders` method.
 */
const okRepoStatus: RepoStatus = {
  ...repoStatus,
  repositoryStatus: 'Ok',
};

const aheadRepoStatus: RepoStatus = {
  ...repoStatus,
  aheadBy: 1,
  repositoryStatus: 'Ok',
};

const mergeConflictRepoStatus: RepoStatus = {
  ...repoStatus,
  aheadBy: 1,
  behindBy: 1,
  hasMergeConflict: true,
  repositoryStatus: 'CheckoutConflict',
};

const getRepoStatus = jest.fn().mockImplementation(() => Promise.resolve(okRepoStatus));
const getRepoPull = jest.fn().mockImplementation(() => Promise.resolve(okRepoStatus));
const commitAndPushChanges = jest.fn().mockImplementation(() => Promise.resolve(okRepoStatus));

const defaultQueries: Partial<ServicesContextProps> = {
  getRepoStatus,
  getRepoPull,
  commitAndPushChanges,
};

const defaultProps: IVersionControlButtonsProps = {
  hasPushRight: true,
  org,
  app,
};

describe('Shared > Version Control > VersionControlHeader', () => {
  afterEach(jest.clearAllMocks);

  it('should render header when type is not defined', async () => {
    render();
    await waitFor(() => expect(queriesMock.getRepoMetadata).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId(testids.versionControlHeader)).not.toBeNull();
  });

  it('Refetches queries when clicking the fetch button', async () => {
    render();
    const fetchButton = screen.getByRole('button', { name: textMock('sync_header.fetch_changes') });
    await act(() => user.click(fetchButton));
    await waitFor(() => expect(queriesMock.getRepoMetadata).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getRepoStatus).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getRepoPull).toHaveBeenCalledTimes(1));
  });

  it('should render commit message modal when clicking the share button with changes', async () => {
    const mockGetRepoStatus = jest.fn().mockImplementation(() => Promise.resolve(aheadRepoStatus));
    const mockQueries: Partial<ServicesContextProps> = {
      getRepoStatus: mockGetRepoStatus,
    };
    render({}, mockQueries);

    // await waitFor(() => expect(getRepoPull).toHaveBeenCalledTimes(1));
    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.no_changes_to_share'),
    });
    await act(() => user.click(shareButton));
    await waitFor(() => expect(mockGetRepoStatus).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText(textMock('sync_header.describe_and_validate')),
    ).toBeInTheDocument();
  });

  it('should render no changes message when clicking the share button with no changes', async () => {
    render();

    // await waitFor(() => expect(getRepoPull).toHaveBeenCalledTimes(1));
    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.no_changes_to_share'),
    });
    await act(() => user.click(shareButton));
    await waitFor(() => expect(getRepoStatus).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(textMock('sync_header.nothing_to_push'))).toBeInTheDocument();
  });

  it('should render commit message modal when clicking the share button with merge conflicts', async () => {
    const mockGetRepoStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve(mergeConflictRepoStatus));
    const mockQueries: Partial<ServicesContextProps> = {
      getRepoStatus: mockGetRepoStatus,
    };
    render({}, mockQueries);

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.no_changes_to_share'),
    });
    await act(() => user.click(shareButton));
    await waitFor(() => expect(mockGetRepoStatus).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText(textMock('sync_header.describe_and_validate')),
    ).toBeInTheDocument();
  });

  it('should call commitAndPush endpoint clicking the share button with changes', async () => {
    const mockGetRepoStatus = jest.fn().mockImplementation(() => Promise.resolve(aheadRepoStatus));
    const mockQueries: Partial<ServicesContextProps> = {
      getRepoStatus: mockGetRepoStatus,
    };
    render({}, mockQueries);

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.no_changes_to_share'),
    });
    await act(() => user.click(shareButton));

    await waitFor(() => expect(mockGetRepoStatus).toHaveBeenCalledTimes(1));
    await act(() =>
      user.click(
        screen.getByRole('button', { name: textMock('sync_header.describe_and_validate_btnText') }),
      ),
    );
    await waitFor(() => expect(commitAndPushChanges).toHaveBeenCalledTimes(1));
  });

  it('should call repoPull when commitAndPush is rejected', async () => {
    const mockGetRepoStatus = jest.fn().mockImplementation(() => Promise.resolve(aheadRepoStatus));
    const mockCommitAndPushChanges = jest.fn().mockImplementation(() => Promise.reject('error'));
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    const mockQueries: Partial<ServicesContextProps> = {
      getRepoStatus: mockGetRepoStatus,
      commitAndPushChanges: mockCommitAndPushChanges,
    };
    render({}, mockQueries);

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.no_changes_to_share'),
    });
    await act(() => user.click(shareButton));

    await waitFor(() => expect(mockGetRepoStatus).toHaveBeenCalledTimes(1));
    await act(() =>
      user.click(
        screen.getByRole('button', { name: textMock('sync_header.describe_and_validate_btnText') }),
      ),
    );
    await waitFor(() => expect(mockCommitAndPushChanges).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockConsoleError).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getRepoPull).toHaveBeenCalledTimes(1));
  });

  it('should show mergeconflict message when commitAndPush is rejected and repoPull returns mergeconflict status', async () => {
    const mockGetRepoStatus = jest.fn().mockImplementation(() => Promise.resolve(aheadRepoStatus));
    const mockCommitAndPushChanges = jest.fn().mockImplementation(() => Promise.reject('error'));
    const mockRepoPull = jest
      .fn()
      .mockImplementation(() => Promise.resolve(mergeConflictRepoStatus));
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    const mockQueries: Partial<ServicesContextProps> = {
      getRepoStatus: mockGetRepoStatus,
      commitAndPushChanges: mockCommitAndPushChanges,
      getRepoPull: mockRepoPull,
    };
    render({}, mockQueries);

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.no_changes_to_share'),
    });
    await act(() => user.click(shareButton));

    await waitFor(() => expect(mockGetRepoStatus).toHaveBeenCalledTimes(1));
    await act(() =>
      user.click(
        screen.getByRole('button', { name: textMock('sync_header.describe_and_validate_btnText') }),
      ),
    );
    expect(mockConsoleError).toHaveBeenCalled();
    expect(
      await screen.findByText(textMock('sync_header.merge_conflict_occured')),
    ).toBeInTheDocument();
  });
});

const render = (
  props: Partial<IVersionControlButtonsProps> = {},
  queries: Partial<ServicesContextProps> = {},
) =>
  renderRtl(
    <ServicesContextProvider
      {...queriesMock}
      {...defaultQueries}
      {...queries}
      client={queryClientMock}
    >
      <VersionControlButtons {...defaultProps} {...props} />
    </ServicesContextProvider>,
  );
