import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { IVersionControlButtonsProps } from './VersionControlButtons';
import { VersionControlButtons } from './VersionControlButtons';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { RepoStatus } from 'app-shared/types/RepoStatus';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { repository, repoStatus } from 'app-shared/mocks/mocks';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';

const user = userEvent.setup();

/**
 * This part is probably not ideal. A more scalable way to mock these calls should be done in a more central place
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
  org,
  app,
  onPullSuccess: jest.fn(),
};

describe('Shared > Version Control > VersionControlHeader', () => {
  afterEach(jest.clearAllMocks);

  it('should render header with fetch and share button by default', () => {
    renderVersionControlButtons();
    const fetchButton = screen.getByRole('button', { name: textMock('sync_header.fetch_changes') });
    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });
    expect(fetchButton).toBeInTheDocument();
    expect(shareButton).toBeInTheDocument();
    expect(shareButton).toHaveAttribute('title', textMock('sync_header.changes_to_share'));
  });

  it('ReFetches queries when clicking the fetch button', async () => {
    renderVersionControlButtons();
    const fetchButton = screen.getByRole('button', { name: textMock('sync_header.fetch_changes') });
    await user.click(fetchButton);
    await waitFor(() => expect(queriesMock.getRepoMetadata).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getRepoStatus).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(getRepoPull).toHaveBeenCalledTimes(1));
  });

  it('should render commit message modal when clicking the share button with changes', async () => {
    const mockGetRepoStatus = jest.fn().mockImplementation(() => Promise.resolve(aheadRepoStatus));
    const mockQueries: Partial<ServicesContextProps> = {
      getRepoStatus: mockGetRepoStatus,
    };
    renderVersionControlButtons(mockQueries);

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });
    await user.click(shareButton);
    await waitFor(() => expect(mockGetRepoStatus).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByText(textMock('sync_header.describe_and_validate')),
    ).toBeInTheDocument();
  });

  it('should render no changes message when clicking the share button with no changes', async () => {
    renderVersionControlButtons();

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });
    await user.click(shareButton);
    await waitFor(() => expect(getRepoStatus).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(textMock('sync_header.nothing_to_push'))).toBeInTheDocument();
  });

  it('should render commit message modal when clicking the share button with merge conflicts', async () => {
    const mockGetRepoStatus = jest.fn().mockReturnValue(mergeConflictRepoStatus);
    const mockQueries: Partial<ServicesContextProps> = {
      getRepoStatus: mockGetRepoStatus,
    };
    renderVersionControlButtons(mockQueries);

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });
    await user.click(shareButton);
    await waitFor(() => expect(mockGetRepoStatus).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByText(textMock('sync_header.describe_and_validate')),
    ).toBeInTheDocument();
  });

  it('should call commitAndPush endpoint clicking the share button with changes', async () => {
    const mockGetRepoStatus = jest.fn().mockReturnValue(aheadRepoStatus);
    const mockQueries: Partial<ServicesContextProps> = {
      getRepoStatus: mockGetRepoStatus,
    };
    renderVersionControlButtons(mockQueries);

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });
    await user.click(shareButton);

    await waitFor(() => expect(mockGetRepoStatus).toHaveBeenCalledTimes(2));
    await user.click(
      screen.getByRole('button', { name: textMock('sync_header.describe_and_validate_btnText') }),
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
    renderVersionControlButtons(mockQueries);

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });
    await user.click(shareButton);

    await waitFor(() => expect(mockGetRepoStatus).toHaveBeenCalledTimes(2));
    await user.click(
      screen.getByRole('button', { name: textMock('sync_header.describe_and_validate_btnText') }),
    );
    await waitFor(() => expect(mockCommitAndPushChanges).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockConsoleError).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getRepoPull).toHaveBeenCalledTimes(1));
  });

  it('should show mergeConflict message when commitAndPush is rejected and repoPull returns merge conflict status', async () => {
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
    renderVersionControlButtons(mockQueries);

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });
    await user.click(shareButton);

    await waitFor(() => expect(mockGetRepoStatus).toHaveBeenCalledTimes(2));
    await user.click(
      screen.getByRole('button', { name: textMock('sync_header.describe_and_validate_btnText') }),
    );

    const mergeConflictButton = screen.getByRole('button', {
      name: textMock('sync_header.merge_conflict'),
    });
    expect(mergeConflictButton).toHaveAttribute('disabled');
    expect(mergeConflictButton).toHaveAttribute(
      'title',
      textMock('sync_header.merge_conflict_title'),
    );
    expect(mockConsoleError).toHaveBeenCalled();
  });

  it('should disable version control buttons when repoPull returns merge conflict status', async () => {
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
    renderVersionControlButtons(mockQueries);

    const fetchButton = screen.getByRole('button', { name: textMock('sync_header.fetch_changes') });
    await user.click(fetchButton);
    expect(fetchButton).toHaveAttribute('disabled');
    const mergeConflictButton = screen.getByRole('button', {
      name: textMock('sync_header.merge_conflict'),
    });
    expect(mergeConflictButton).toHaveAttribute('disabled');
    expect(mergeConflictButton).toHaveAttribute(
      'title',
      textMock('sync_header.merge_conflict_title'),
    );
    expect(mockConsoleError).toHaveBeenCalled();
  });

  it('should show no push right in button title when repo metadata says no push rights', () => {
    renderVersionControlButtons({}, false);

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });
    expect(shareButton).toHaveAttribute('title', textMock('sync_header.sharing_changes_no_access'));
  });

  it('should call onPullSuccess when fetching changes', async () => {
    renderVersionControlButtons();
    const fetchButton = screen.getByRole('button', { name: textMock('sync_header.fetch_changes') });
    await user.click(fetchButton);
    expect(defaultProps.onPullSuccess).toHaveBeenCalledTimes(1);
  });
});

const renderVersionControlButtons = (
  queries: Partial<ServicesContextProps> = {},
  hasPushRights = true,
) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.RepoMetadata, org, app], {
    ...repository,
    permissions: { ...repository.permissions, push: hasPushRights },
  });
  render(
    <ServicesContextProvider {...queriesMock} {...defaultQueries} {...queries} client={queryClient}>
      <VersionControlButtons {...defaultProps} />
    </ServicesContextProvider>,
  );
};
