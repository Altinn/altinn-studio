import React from 'react';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { ReleaseContainer } from './ReleaseContainer';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import {
  type ServicesContextProps,
  ServicesContextProvider,
} from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { repoStatus } from 'app-shared/mocks/mocks';
import userEvent from '@testing-library/user-event';
import { BuildResult, BuildStatus } from 'app-shared/types/Build';

const renderReleaseContainer = (queries?: Partial<ServicesContextProps>) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  render(
    <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
      <ReleaseContainer />
    </ServicesContextProvider>,
  );
};

describe('ReleaseContainer', () => {
  afterEach(() => jest.clearAllMocks);
  it('renders the component with a spinner', () => {
    renderReleaseContainer();
    expect(screen.getByText(textMock('app_release.release_tab_versions'))).toBeInTheDocument();
    expect(screen.getByText(textMock('app_create_release.check_status'))).toBeInTheDocument();

    const spinner = screen.getByText(textMock('app_create_release.loading'));
    expect(spinner).toBeInTheDocument();

    expect(screen.getByText(textMock('app_release.earlier_releases'))).toBeInTheDocument();
  });

  it('renders an option to build release if master branch commit differs from latest release commit', async () => {
    const user = userEvent.setup();
    const mockGetRepoStatus = jest.fn().mockImplementation(() => Promise.resolve(repoStatus));
    const mockGetBranchStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ commit: { id: '123' } }));
    renderReleaseContainer({
      getRepoStatus: mockGetRepoStatus,
      getBranchStatus: mockGetBranchStatus,
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('app_create_release.loading')),
    );

    const statusButton = screen.getByRole('button', {
      name: textMock('app_create_release.status_popover'),
    });
    await user.click(statusButton);
    expect(screen.getByText(textMock('app_create_release.ok'))).toBeInTheDocument();
    expect(screen.getByText(textMock('app_release.release_title'))).toBeInTheDocument();
    expect(screen.getByText(textMock('app_release.release_title_link'))).toBeInTheDocument();
    expect(mockGetBranchStatus).toHaveBeenCalledTimes(1);
    expect(mockGetBranchStatus).toHaveBeenCalledTimes(1);
  });

  it('calls getBranchRepoStatus again to refetch if clicking "latest commit fetched from master"', async () => {
    jest.spyOn(window, 'open').mockImplementation(jest.fn());
    const user = userEvent.setup();
    const mockGetRepoStatus = jest.fn().mockImplementation(() => Promise.resolve(repoStatus));
    const mockGetBranchStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ commit: { id: '123' } }));
    renderReleaseContainer({
      getRepoStatus: mockGetRepoStatus,
      getBranchStatus: mockGetBranchStatus,
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('app_create_release.loading')),
    );

    const latestCommitLink = screen.getByRole('link', {
      name: textMock('app_release.release_title_link'),
    });
    await user.click(latestCommitLink);
    expect(mockGetBranchStatus).toHaveBeenCalledTimes(2);
  });

  it('renders status that latest commit fetched from master is the same as commit for latest release', async () => {
    const user = userEvent.setup();
    const mockLatestCommit = '123';
    const mockTagName = 'v1';
    const mockGetRepoStatus = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve({ ...repoStatus, contentStatus: [{ filePath: '', fileStatus: '' }] }),
      );
    const mockGetBranchStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ commit: { id: mockLatestCommit } }));
    const mockGetAppReleases = jest.fn().mockImplementation(() =>
      Promise.resolve({
        results: [
          {
            targetCommitish: mockLatestCommit,
            tagName: mockTagName,
            build: { result: BuildResult.succeeded, status: BuildStatus.completed },
          },
        ],
      }),
    );
    renderReleaseContainer({
      getRepoStatus: mockGetRepoStatus,
      getBranchStatus: mockGetBranchStatus,
      getAppReleases: mockGetAppReleases,
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('app_create_release.loading')),
    );

    const statusButton = screen.getByRole('button', {
      name: textMock('app_create_release.status_popover'),
    });
    await user.click(statusButton);
    expect(
      screen.getByText(textMock('app_create_release.local_changes_cant_build')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('app_release.release_built_on_version', { version: mockTagName })),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('app_create_release.no_changes_on_current_release')),
    ).toBeInTheDocument();
    const latestCommitLink = screen.getByRole('link', {
      name: textMock('app_release.release_built_on_version_link'),
    });
    expect(latestCommitLink).toBeInTheDocument();
  });

  it('renders status that there local changes that will not be included in build if not pushed', async () => {
    const user = userEvent.setup();
    const mockGetRepoStatus = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve({ ...repoStatus, contentStatus: [{ filePath: '', fileStatus: '' }] }),
      );
    const mockGetBranchStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ commit: { id: '123' } }));
    const mockGetAppReleases = jest.fn().mockImplementation(() =>
      Promise.resolve({
        results: [
          {
            targetCommitish: '122',
            tagName: 'v1',
            build: { result: BuildResult.succeeded },
          },
        ],
      }),
    );
    renderReleaseContainer({
      getRepoStatus: mockGetRepoStatus,
      getBranchStatus: mockGetBranchStatus,
      getAppReleases: mockGetAppReleases,
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('app_create_release.loading')),
    );

    const statusButton = screen.getByRole('button', {
      name: textMock('app_create_release.status_popover'),
    });
    await user.click(statusButton);
    expect(
      screen.getByText(textMock('app_create_release.local_changes_can_build')),
    ).toBeInTheDocument();
  });
});
